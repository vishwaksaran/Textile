import 'server-only';

import { Resend } from 'resend';
import { STORE, appUrl, envOr, storeAddressOneLine } from '@/lib/config';
import { emailThumbUrl } from '@/lib/images';
import { describeItem, formatDate, invoiceNumber, shortOrderId } from '@/lib/utils';
import type { Order } from '@/types';

const apiKey = process.env.RESEND_API_KEY;
export const isEmailConfigured = Boolean(apiKey);

const FROM = envOr(process.env.RESEND_FROM, `${STORE.name} <onboarding@resend.dev>`);

/**
 * Where a "new order" alert goes. Private — this is never published.
 *
 * Accepts a comma-separated list so the shop and whoever packs the parcels
 * can both be told without anyone having to forward anything.
 *
 * Falls back to ADMIN_EMAIL, which is what this used before the public and
 * private addresses were split apart.
 */
const ORDER_ALERT_TO = envOr(process.env.ORDER_ALERT_EMAIL, envOr(process.env.ADMIN_EMAIL, ''))
  .split(',')
  .map((address) => address.trim())
  .filter(Boolean);

export const isOrderAlertConfigured = Boolean(apiKey) && ORDER_ALERT_TO.length > 0;

/**
 * Whether the customer hears from us by email at all.
 *
 * Off unless switched on, because the shop reaches its customers on WhatsApp
 * and an unexpected email from a sender they have never seen is a support
 * question, not a courtesy. The alert to the shop is unaffected: it is how the
 * parcel gets packed, and it always goes.
 *
 * Turning this on is one variable, and everything it enables is already
 * written — the confirmation with the invoice attached, and the dispatch note.
 */
const CUSTOMER_EMAILS_ENABLED =
  envOr(process.env.CUSTOMER_EMAILS_ENABLED, '').trim().toLowerCase() === 'true';

export { CUSTOMER_EMAILS_ENABLED };

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

/**
 * Item names reach this template from the admin, and now carry a size label
 * built by concatenation. An ampersand in either would break the markup, so
 * the one interpolated value that is not ours is escaped.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The address the parcel goes to, on one line, in the order a label is
 * written.
 *
 * State was missing, which is the one line nobody can guess from the others:
 * it decides the delivery charge and which half of the GST applies, and two
 * cities in India share a name often enough that a packer should not have to.
 * Empty parts are dropped rather than left as stray commas.
 */
function billingAddress(order: Order): string {
  return [
    order.customer_address,
    order.customer_city,
    order.customer_state,
    order.customer_pincode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * One line per item, with the piece's own photograph beside it.
 *
 * Laid out as a nested table rather than a flex row, because half the mail
 * clients in use predate flexbox and Outlook still renders through Word.
 *
 * The image carries width and height attributes as well as CSS: Gmail blocks
 * remote images until the reader asks for them, and without a reserved box
 * the text would shift sideways the moment they do. A tinted placeholder sits
 * behind it so a blocked image reads as a picture rather than a gap, and the
 * alt text names the piece either way.
 */
function itemRows(order: Order): string {
  return (order.order_items ?? [])
    .map((item) => {
      // The frozen one, so the alert shows the piece that was actually
      // bought rather than whatever the product leads with today.
      const art = emailThumbUrl(item.image_at_time ?? item.products?.images?.[0] ?? null);
      const name = escapeHtml(describeItem(item));

      const thumb = art
        ? `<img src="${escapeHtml(art)}" alt="${name}" width="48" height="60"
             style="display:block;width:48px;height:60px;border:0;outline:none;
                    object-fit:cover;background:#eae1d4;" />`
        : `<div style="width:48px;height:60px;background:#eae1d4;"></div>`;

      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eae1d4;color:#1f1b13;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="48" style="width:48px;padding-right:12px;vertical-align:middle;">
                ${thumb}
              </td>
              <td style="vertical-align:middle;color:#1f1b13;">${name}</td>
            </tr>
          </table>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eae1d4;text-align:center;color:#4d4635;vertical-align:middle;">
          ${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eae1d4;text-align:right;color:#1f1b13;vertical-align:middle;">
          ${money(Number(item.price_at_time) * item.quantity)}
        </td>
      </tr>`;
    })
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
export async function sendAdminOrderEmail(
  order: Order,
  invoicePdf?: Uint8Array,
): Promise<EmailResult> {
  const api = client();
  if (!api) return { sent: false, skipped: 'RESEND_API_KEY is not set' };
  if (ORDER_ALERT_TO.length === 0) {
    return { sent: false, skipped: 'ORDER_ALERT_EMAIL is not set' };
  }

  // The one thing that must not wait until someone opens the admin: money was
  // taken for something that cannot be shipped, so it leads the email.
  const shortfall = order.stock_shortfall ?? [];
  const shortfallBanner =
    shortfall.length === 0
      ? ''
      : `<div style="border:2px solid #b3261e;background:#fceeed;padding:16px;margin:0 0 20px;">
           <p style="font-family:Georgia,serif;font-size:16px;color:#b3261e;margin:0 0 8px;">Paid, but out of stock</p>
           <p style="font-size:13px;color:#1f1b13;line-height:1.6;margin:0;">
             Another customer took the last of <strong>${shortfall.join(', ')}</strong> first.
             Call ${escapeHtml(order.customer_name)} on ${escapeHtml(order.customer_phone)} to offer a substitute or a
             refund. Do not ship this order as it stands.
           </p>
         </div>`;

  const html = shell(
    shortfall.length > 0 ? 'Order needs attention' : 'New order received',
    `${shortfallBanner}
     <h1 style="font-family:Georgia,serif;font-size:20px;color:#4A0404;margin:0 0 16px;">Order ${shortOrderId(order.id)}</h1>
     <p style="font-size:14px;color:#4d4635;line-height:1.6;margin:0 0 20px;">
       <strong style="color:#1f1b13;">${escapeHtml(order.customer_name)}</strong><br/>
       ${escapeHtml(order.customer_phone)} · ${escapeHtml(order.customer_email)}<br/>
       ${escapeHtml(billingAddress(order))}
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
      to: ORDER_ALERT_TO,
      // Everything needed to triage from a phone lock screen: what, how much,
      // and where it is going.
      subject:
        shortfall.length > 0
          ? `ACTION NEEDED — order #${shortOrderId(order.id)} paid but out of stock`
          : `New order #${shortOrderId(order.id)} — ${money(Number(order.total_amount))} to ${order.customer_city || order.customer_state || 'India'}`,
      html,
      /*
        The customer's receipt, attached to the shop's copy.

        While customer emails are off this is the only place the invoice
        exists outside the admin, and a shop that has to open a browser to
        find the bill for the parcel in front of it will stop bothering.
      */
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

/** Confirmation to the customer, with the invoice attached when available. */
export async function sendCustomerConfirmationEmail(
  order: Order,
  invoicePdf?: Uint8Array,
): Promise<EmailResult> {
  const api = client();
  if (!api) return { sent: false, skipped: 'RESEND_API_KEY is not set' };
  // Customer-facing, so it waits on the switch above.
  if (!CUSTOMER_EMAILS_ENABLED) {
    return { sent: false, skipped: 'CUSTOMER_EMAILS_ENABLED is not true' };
  }

  const invoiceLink = appUrl(`/api/invoice/${order.id}`);

  const html = shell(
    'Order confirmed',
    `<h1 style="font-family:Georgia,serif;font-size:20px;color:#4A0404;margin:0 0 12px;">Thank you, ${escapeHtml(order.customer_name.split(' ')[0])}.</h1>
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
  // Customer-facing, so it waits on the switch above.
  if (!CUSTOMER_EMAILS_ENABLED) {
    return { sent: false, skipped: 'CUSTOMER_EMAILS_ENABLED is not true' };
  }

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
