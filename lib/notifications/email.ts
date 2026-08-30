import 'server-only';

import { Resend } from 'resend';
import { STORE, appUrl, envOr, storeAddressOneLine } from '@/lib/config';
import { formatDate, invoiceNumber, shortOrderId } from '@/lib/utils';
import type { Order } from '@/types';

const apiKey = process.env.RESEND_API_KEY;
export const isEmailConfigured = Boolean(apiKey);

const FROM = envOr(process.env.RESEND_FROM, `${STORE.name} <onboarding@resend.dev>`);
const ADMIN_TO = process.env.ADMIN_EMAIL;

let resend: Resend | null = null;
function client(): Resend | null {
  if (!apiKey) return null;
  resend ??= new Resend(apiKey);
  return resend;
}

export interface EmailResult {
  sent: boolean;
  id?: string;
  skipped?: string;
  error?: string;
}

function money(n: number) {
  return `Rs. ${Number(n).toLocaleString('en-IN')}`;
}

function itemRows(order: Order): string {
  return (order.order_items ?? [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eae1d4;color:#1f1b13;">
          ${item.products?.name ?? 'Handloom piece'}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eae1d4;text-align:center;color:#4d4635;">
          ${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eae1d4;text-align:right;color:#1f1b13;">
          ${money(Number(item.price_at_time) * item.quantity)}
        </td>
      </tr>`,
    )
    .join('');
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fff8f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf5;border:1px solid #d0c5af;">
        <tr><td style="background:#4A0404;padding:24px 32px;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#ffe088;letter-spacing:1px;">${STORE.name}</div>
          <div style="font-size:11px;color:#fffdf5;opacity:.8;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">${title}</div>
        </td></tr>
        <tr><td style="padding:32px;">${inner}</td></tr>
        <tr><td style="background:#fbf3e5;padding:20px 32px;border-top:1px solid #d4af37;">
          <div style="font-size:11px;color:#4d4635;line-height:1.6;">
            ${storeAddressOneLine()}<br/>
            ${STORE.email} · ${STORE.phone}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/** Notifies the shop the moment a payment clears. */
export async function sendAdminOrderEmail(order: Order): Promise<EmailResult> {
  const api = client();
  if (!api) return { sent: false, skipped: 'RESEND_API_KEY is not set' };
  if (!ADMIN_TO) return { sent: false, skipped: 'ADMIN_EMAIL is not set' };

  const html = shell(
    'New order received',
    `<h1 style="font-family:Georgia,serif;font-size:20px;color:#4A0404;margin:0 0 16px;">Order ${shortOrderId(order.id)}</h1>
     <p style="font-size:14px;color:#4d4635;line-height:1.6;margin:0 0 20px;">
       <strong style="color:#1f1b13;">${order.customer_name}</strong><br/>
       ${order.customer_phone} · ${order.customer_email}<br/>
       ${order.customer_address}, ${order.customer_city ?? ''} ${order.customer_pincode ?? ''}
     </p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
       ${itemRows(order)}
       <tr>
         <td style="padding:14px 0;font-weight:bold;color:#4A0404;">Total</td>
         <td></td>
         <td style="padding:14px 0;text-align:right;font-weight:bold;color:#4A0404;">${money(Number(order.total_amount))}</td>
       </tr>
     </table>
     <p style="font-size:12px;color:#4d4635;margin:16px 0 24px;">Payment ID: ${order.razorpay_payment_id ?? '—'}</p>
     <a href="${appUrl(`/admin/orders/${order.id}`)}" style="display:inline-block;background:#4A0404;color:#ffe088;padding:12px 24px;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Open in admin</a>`,
  );

  try {
    const { data, error } = await api.emails.send({
      from: FROM,
      to: ADMIN_TO,
      subject: `New order received — #${shortOrderId(order.id)} · ${money(Number(order.total_amount))}`,
      html,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

/** Confirmation to the customer, with the invoice attached when available. */
export async function sendCustomerConfirmationEmail(
  order: Order,
  invoicePdf?: Uint8Array,
): Promise<EmailResult> {
  const api = client();
  if (!api) return { sent: false, skipped: 'RESEND_API_KEY is not set' };

  const invoiceLink = appUrl(`/api/invoice/${order.id}`);

  const html = shell(
    'Order confirmed',
    `<h1 style="font-family:Georgia,serif;font-size:20px;color:#4A0404;margin:0 0 12px;">Thank you, ${order.customer_name.split(' ')[0]}.</h1>
     <p style="font-size:14px;color:#4d4635;line-height:1.7;margin:0 0 20px;">
       We have received your payment of <strong style="color:#1f1b13;">${money(Number(order.total_amount))}</strong>.
       Your pieces are being wrapped in muslin and will leave our Coimbatore store within two working days.
     </p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
       ${itemRows(order)}
       <tr>
         <td style="padding:14px 0;font-weight:bold;color:#4A0404;">Total paid</td>
         <td></td>
         <td style="padding:14px 0;text-align:right;font-weight:bold;color:#4A0404;">${money(Number(order.total_amount))}</td>
       </tr>
     </table>
     <p style="font-size:12px;color:#4d4635;margin:18px 0;">
       Order ID: <strong>${shortOrderId(order.id)}</strong><br/>
       Payment ID: ${order.razorpay_payment_id ?? '—'}<br/>
       Placed on ${formatDate(order.created_at)}
     </p>
     <a href="${invoiceLink}" style="display:inline-block;background:#4A0404;color:#ffe088;padding:12px 24px;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Download invoice</a>
     <a href="${appUrl(`/track?id=${order.id}`)}" style="display:inline-block;margin-left:8px;border:1px solid #4A0404;color:#4A0404;padding:11px 24px;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Track this order</a>
     <p style="font-size:12px;color:#4d4635;margin:24px 0 0;line-height:1.6;">
       Keep this email — the Track button above opens your order directly. You can also
       track it any time at ${appUrl('/track')} using order ID
       <strong>${shortOrderId(order.id)}</strong> and the mobile number
       ${order.customer_phone ? `ending ${String(order.customer_phone).slice(-4)}` : 'you gave at checkout'}.
     </p>
     <p style="font-size:12px;color:#4d4635;margin:12px 0 0;line-height:1.6;">
       We will send your tracking details by WhatsApp and SMS as soon as the parcel is handed to the courier.
     </p>`,
  );

  try {
    const { data, error } = await api.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Your ${STORE.name} order is confirmed`,
      html,
      attachments: invoicePdf
        ? [
            {
              filename: `${invoiceNumber(order.id, order.created_at)}.pdf`,
              content: Buffer.from(invoicePdf).toString('base64'),
            },
          ]
        : undefined,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

/** Shipping email, sent alongside the WhatsApp and SMS notifications. */
export async function sendShippedEmail(
  order: Order,
  trackingUrl: string,
): Promise<EmailResult> {
  const api = client();
  if (!api) return { sent: false, skipped: 'RESEND_API_KEY is not set' };

  const html = shell(
    'Your order has shipped',
    `<h1 style="font-family:Georgia,serif;font-size:20px;color:#4A0404;margin:0 0 12px;">On its way.</h1>
     <p style="font-size:14px;color:#4d4635;line-height:1.7;margin:0 0 20px;">
       Order <strong>${shortOrderId(order.id)}</strong> has been handed to ${order.courier_name ?? 'our courier'}.
     </p>
     <p style="font-size:14px;color:#1f1b13;margin:0 0 20px;">
       Tracking ID: <strong>${order.tracking_id ?? '—'}</strong>
     </p>
     <a href="${trackingUrl}" style="display:inline-block;background:#4A0404;color:#ffe088;padding:12px 24px;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Track your parcel</a>`,
  );

  try {
    const { data, error } = await api.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Your ${STORE.name} order has shipped`,
      html,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
