import 'server-only';

import { STORE } from '@/lib/config';
import type { NotifyResult } from '@/lib/notifications/whatsapp';

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

const fast2smsKey = process.env.FAST2SMS_API_KEY;
const fast2smsRoute = process.env.FAST2SMS_ROUTE ?? 'q';

export type SmsProvider = 'twilio' | 'fast2sms' | 'none';

export function smsProvider(): SmsProvider {
  if (twilioSid && twilioToken && twilioFrom) return 'twilio';
  if (fast2smsKey) return 'fast2sms';
  return 'none';
}

export const isSmsConfigured = smsProvider() !== 'none';

export interface SmsTrackingPayload {
  phone: string;
  orderId: string;
  trackingId: string;
  courierName: string;
  trackingUrl: string;
}

export function trackingSmsBody(p: SmsTrackingPayload): string {
  return `${STORE.name}: Order #${p.orderId} has shipped! Tracking: ${p.trackingId} (${p.courierName}). Track: ${p.trackingUrl}. Thank you.`;
}

/**
 * Sends the tracking SMS through whichever provider is configured.
 * Twilio takes precedence; Fast2SMS is the India-local fallback.
 */
export async function sendSmsTracking(payload: SmsTrackingPayload): Promise<NotifyResult> {
  const provider = smsProvider();
  const digits = payload.phone.replace(/\D/g, '').slice(-10);
  const body = trackingSmsBody(payload);

  if (provider === 'none') {
    return { sent: false, skipped: 'No SMS provider configured (Twilio or Fast2SMS)' };
  }

  try {
    if (provider === 'twilio') {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: `+91${digits}`, From: twilioFrom!, Body: body }),
        },
      );
      const json = await res.json();
      if (!res.ok) return { sent: false, error: json?.message ?? `Twilio returned ${res.status}` };
      return { sent: true, id: json?.sid };
    }

    // Fast2SMS
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: fast2smsKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: fast2smsRoute,
        message: body,
        language: 'english',
        flash: 0,
        numbers: digits,
      }),
    });
    const json = await res.json();
    if (!res.ok || json?.return === false) {
      return { sent: false, error: json?.message ?? `Fast2SMS returned ${res.status}` };
    }
    return { sent: true, id: json?.request_id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
