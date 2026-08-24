import 'server-only';

import { buildInvoicePdf, uploadInvoice } from '@/lib/invoice';
import { sendAdminOrderEmail, sendCustomerConfirmationEmail } from '@/lib/notifications/email';
import { commitStock, getOrderWithItems, linesForOrder, updateOrder } from '@/lib/orders';
import { appUrl } from '@/lib/config';
import type { Order } from '@/types';

export interface FulfilmentReport {
  order: Order;
  alreadyProcessed: boolean;
  stockFailures: string[];
  invoiceUrl: string | null;
  adminEmail: string;
  customerEmail: string;
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
      invoiceUrl: existing.invoice_url,
      adminEmail: 'skipped (already processed)',
      customerEmail: 'skipped (already processed)',
    };
  }

  await updateOrder(orderId, {
    payment_status: 'paid',
    razorpay_payment_id: paymentId,
  });

  const lines = await linesForOrder(orderId);
  const stockFailures = await commitStock(lines);

  // Re-read so the invoice and emails carry the payment id and joined items.
  const paid = (await getOrderWithItems(orderId))!;

  let invoiceUrl: string | null = null;
  let pdf: Uint8Array | undefined;
  try {
    pdf = buildInvoicePdf(paid);
    invoiceUrl = await uploadInvoice(paid, pdf);
  } catch {
    // A failed invoice must never lose a paid order; /api/invoice/[id]
    // regenerates it on demand.
  }

  // Always store a working link, even when Storage is unavailable.
  const resolvedInvoiceUrl = invoiceUrl ?? appUrl(`/api/invoice/${orderId}`);
  await updateOrder(orderId, { invoice_url: resolvedInvoiceUrl });

  const withInvoice = { ...paid, invoice_url: resolvedInvoiceUrl };

  const [adminResult, customerResult] = await Promise.all([
    sendAdminOrderEmail(withInvoice),
    sendCustomerConfirmationEmail(withInvoice, pdf),
  ]);

  return {
    order: withInvoice,
    alreadyProcessed: false,
    stockFailures,
    invoiceUrl: resolvedInvoiceUrl,
    adminEmail: describe(adminResult),
    customerEmail: describe(customerResult),
  };
}

function describe(result: { sent: boolean; skipped?: string; error?: string }): string {
  if (result.sent) return 'sent';
  return result.skipped ?? result.error ?? 'not sent';
}
