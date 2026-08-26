import 'server-only';

import { STORE, envOr } from '@/lib/config';

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const templateName = envOr(process.env.WHATSAPP_TEMPLATE_NAME, 'order_shipped_tracking');
const confirmTemplateName = envOr(
  process.env.WHATSAPP_CONFIRM_TEMPLATE_NAME,
  'order_confirmation',
);
const templateLang = envOr(process.env.WHATSAPP_TEMPLATE_LANG, 'en');
const graphVersion = envOr(process.env.WHATSAPP_GRAPH_VERSION, 'v21.0');

export const isWhatsAppConfigured = Boolean(token && phoneNumberId);

export interface NotifyResult {
  sent: boolean;
  id?: string;
  skipped?: string;
  error?: string;
}

export interface WhatsAppTrackingPayload {
  /** 10-digit Indian number; the country code is added here. */
  phone: string;
  customerName: string;
  orderId: string;
  trackingId: string;
  courierName: string;
  trackingUrl: string;
  invoiceUrl?: string | null;
}

/**
 * Sends the pre-approved `order_shipped_tracking` template.
 *
 * Body placeholders, in order:
 *   {{1}} customer name   {{2}} order id     {{3}} tracking id
 *   {{4}} courier         {{5}} tracking url {{6}} invoice url
 *
 * Meta rejects newlines and tabs inside template parameters, so every value
 * is flattened before it is sent.
 */
export async function sendWhatsAppTracking(
  payload: WhatsAppTrackingPayload,
): Promise<NotifyResult> {
  if (!isWhatsAppConfigured) {
    return { sent: false, skipped: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set' };
  }

  const clean = (value: string) => value.replace(/[\n\t]+/g, ' ').trim();
  const to = `91${payload.phone.replace(/\D/g, '').slice(-10)}`;

  const parameters = [
    payload.customerName,
    payload.orderId,
    payload.trackingId,
    payload.courierName,
    payload.trackingUrl,
    payload.invoiceUrl ?? `${STORE.email}`,
  ].map((text) => ({ type: 'text' as const, text: clean(String(text)) }));

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [{ type: 'body', parameters }],
          },
        }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      return { sent: false, error: json?.error?.message ?? `WhatsApp API returned ${res.status}` };
    }
    return { sent: true, id: json?.messages?.[0]?.id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

export interface WhatsAppConfirmationPayload {
  /** 10-digit Indian number; the country code is added here. */
  phone: string;
  customerName: string;
  /** Short code, e.g. 9BA42876 — what the customer sees everywhere else. */
  orderId: string;
  /** Formatted for reading, e.g. "Rs. 64,000". */
  total: string;
  itemSummary: string;
  trackUrl: string;
}

/**
 * Sends the pre-approved `order_confirmation` template the moment payment
 * clears — the WhatsApp equivalent of a receipt.
 *
 * Body placeholders, in order:
 *   {{1}} customer name  {{2}} order id  {{3}} item summary
 *   {{4}} total          {{5}} track url
 *
 * Meta requires this template to be approved before it will send, and
 * rejects newlines and tabs inside parameters, so values are flattened.
 */
export async function sendWhatsAppOrderConfirmation(
  payload: WhatsAppConfirmationPayload,
): Promise<NotifyResult> {
  return sendTemplate(confirmTemplateName, payload.phone, [
    payload.customerName,
    payload.orderId,
    payload.itemSummary,
    payload.total,
    payload.trackUrl,
  ]);
}

/**
 * One send path for every template: same endpoint, same auth, same parameter
 * hygiene. Meta rejects newlines and tabs inside parameters, and an empty
 * parameter fails the whole message, so both are handled here rather than at
 * each call site.
 */
async function sendTemplate(
  name: string,
  phone: string,
  values: (string | null | undefined)[],
): Promise<NotifyResult> {
  if (!isWhatsAppConfigured) {
    return { sent: false, skipped: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set' };
  }

  const to = `91${phone.replace(/\D/g, '').slice(-10)}`;
  const parameters = values.map((value) => ({
    type: 'text' as const,
    // A blank parameter makes Meta reject the message outright.
    text: String(value ?? '').replace(/[\n\t]+/g, ' ').trim() || '-',
  }));

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name,
            language: { code: templateLang },
            components: [{ type: 'body', parameters }],
          },
        }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      return { sent: false, error: json?.error?.message ?? `WhatsApp API returned ${res.status}` };
    }
    return { sent: true, id: json?.messages?.[0]?.id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
