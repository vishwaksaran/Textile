import 'server-only';

import { buildInvoicePdf, uploadInvoice } from '@/lib/invoice';
import { taxForOrder } from '@/lib/tax-settings';
import { sendAdminOrderEmail, sendCustomerConfirmationEmail } from '@/lib/notifications/email';
import { sendWhatsAppOrderConfirmation } from '@/lib/notifications/whatsapp';
import { sendSmsConfirmation } from '@/lib/notifications/sms';
import { formatINR } from '@/lib/utils';
import { shortOrderId } from '@/lib/utils';
import { commitStock, getOrderWithItems, linesForOrder, updateOrder } from '@/lib/orders';
import { revalidateCatalogue } from '@/lib/revalidate';
import { appUrl } from '@/lib/config';
import type { Order } from '@/types';

export interface FulfilmentReport {
  order: Order;
  alreadyProcessed: boolean;
  stockFailures: string[];
  invoiceUrl: string | null;
  adminEmail: string;
  customerEmail: string;
  /** Per-channel outcome, so a silent failure cannot hide behind a paid order. */
  customerWhatsApp: string;
  customerSms: string;
}

/**
 * Everything that happens once a payment is confirmed: mark paid, decrement
 * stock, produce the invoice, notify both sides.
 *
 * Idempotent — the verify endpoint and the Razorpay webhook can both call it
 * for the same order and only the first run does the work.
 */
export async function fulfilPaidOrder(
  orderId: string,
  paymentId: string,
): Promise<FulfilmentReport> {
  const existing = await getOrderWithItems(orderId);
  if (!existing) throw new Error('Order not found.');

  if (existing.payment_status === 'paid') {
    return {
      order: existing,
      alreadyProcessed: true,
      stockFailures: [],
      invoiceUrl: appUrl(`/api/invoice/${orderId}`),
      adminEmail: 'skipped (already processed)',
      customerEmail: 'skipped (already processed)',
      customerWhatsApp: 'skipped (already processed)',
      customerSms: 'skipped (already processed)',
    };
  }

  await updateOrder(orderId, {
    payment_status: 'paid',
    razorpay_payment_id: paymentId,
  });

  const lines = await linesForOrder(orderId);
  const stockFailures = await commitStock(lines);

  // A sale is the other way stock moves. Without this the listing keeps
  // offering a piece that has just been bought, for as long as the page's
  // revalidate window lasts.
  for (const line of lines) revalidateCatalogue({ productId: line.productId });

  // Re-read so the invoice and emails carry the payment id and joined items.
  const paid = (await getOrderWithItems(orderId))!;

  let pdf: Uint8Array | undefined;
  try {
    pdf = buildInvoicePdf(paid, await taxForOrder(paid));
    // Archive only. Nothing customer-facing points at the stored copy.
    await uploadInvoice(paid, pdf);
  } catch {
    // A failed invoice must never lose a paid order; /api/invoice/[id]
    // regenerates it on demand.
  }

  // The link handed to customers is always the app route, never the Storage
  // URL. A stored object can be deleted, moved or expire — and when that
  // happened here, five orders were left pointing at a 400 while the invoice
  // itself was still perfectly reproducible. The route re-renders from the
  // order row, which outlives any file, and it always reflects the current
  // tax settings rather than whatever was frozen into an old PDF.
  const resolvedInvoiceUrl = appUrl(`/api/invoice/${orderId}`);
  await updateOrder(orderId, { invoice_url: resolvedInvoiceUrl });

  const withInvoice = { ...paid, invoice_url: resolvedInvoiceUrl };

  // The receipt goes out over whichever channels are configured. WhatsApp is
  // the one customers here actually read, but each is independent: a failure
  // in one must not suppress the other, and neither can undo a paid order.
  const items = withInvoice.order_items ?? [];
  const itemSummary =
    items.length === 0
      ? 'your order'
      : items.length === 1
        ? `${items[0].products?.name ?? 'Handloom piece'} x${items[0].quantity}`
        : `${items[0].products?.name ?? 'Handloom piece'} and ${items.length - 1} more`;

  const [adminResult, customerResult, whatsappResult, smsResult] = await Promise.all([
    sendAdminOrderEmail(withInvoice),
    sendCustomerConfirmationEmail(withInvoice, pdf),
    withInvoice.customer_phone
      ? sendWhatsAppOrderConfirmation({
          phone: withInvoice.customer_phone,
          customerName: withInvoice.customer_name.split(' ')[0],
          orderId: shortOrderId(withInvoice.id),
          itemSummary,
          total: formatINR(Number(withInvoice.total_amount)).replace(/₹/g, 'Rs. '),
          trackUrl: appUrl(`/track?id=${withInvoice.id}`),
          invoiceUrl: resolvedInvoiceUrl,
        })
      : Promise.resolve({ sent: false, skipped: 'no phone number on the order' }),
    withInvoice.customer_phone
      ? sendSmsConfirmation({
          phone: withInvoice.customer_phone,
          orderId: shortOrderId(withInvoice.id),
          total: formatINR(Number(withInvoice.total_amount)).replace(/₹/g, 'Rs. '),
          // Short code, not the full id: keeps the text to one billable
          // segment, and the link alone does not open the order.
          trackUrl: appUrl(`/track?id=${shortOrderId(withInvoice.id)}`),
        })
      : Promise.resolve({ sent: false, skipped: 'no phone number on the order' }),
  ]);

  return {
    order: withInvoice,
    alreadyProcessed: false,
    stockFailures,
    invoiceUrl: resolvedInvoiceUrl,
    adminEmail: describe(adminResult),
    customerEmail: describe(customerResult),
    customerWhatsApp: describe(whatsappResult),
    customerSms: describe(smsResult),
  };
}

function describe(result: { sent: boolean; skipped?: string; error?: string }): string {
  if (result.sent) return 'sent';
  return result.skipped ?? result.error ?? 'not sent';
}
