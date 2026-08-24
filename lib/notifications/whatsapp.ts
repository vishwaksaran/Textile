import 'server-only';

import { STORE } from '@/lib/config';

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? 'order_shipped_tracking';
const templateLang = process.env.WHATSAPP_TEMPLATE_LANG ?? 'en';
const graphVersion = process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0';

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
