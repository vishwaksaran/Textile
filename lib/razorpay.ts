import 'server-only';

import crypto from 'crypto';
import Razorpay from 'razorpay';

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export const isRazorpayConfigured = Boolean(keyId && keySecret);

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!isRazorpayConfigured) {
    throw new Error(
      'Razorpay is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
    );
  }
  client ??= new Razorpay({ key_id: keyId!, key_secret: keySecret! });
  return client;
}

/** Razorpay works in paise; never send rupees. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

/**
 * Verifies the checkout signature. Uses a timing-safe comparison so the
 * endpoint cannot be used as an oracle.
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!keySecret) return false;

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verifies a Razorpay webhook body against the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface CapturedPayment {
  captured: true;
  amountPaise: number;
  method?: string;
}

export interface UncapturedPayment {
  captured: false;
  /** Razorpay's own status: created, authorized, failed, refunded… */
  status: string;
  reason: string;
}

/**
 * Asks Razorpay what actually happened to a payment.
 *
 * The checkout signature proves the browser's response was not forged. It
 * does NOT prove money moved: a payment can be signed and still sit in
 * `authorized` without ever being captured, and a retry after a failure can
 * leave a reference that verifies but was never paid. Confirming the state
 * from the server, against the amount and order we expect, is the only thing
 * that establishes the shop has actually been paid.
 */
export async function confirmPaymentCaptured({
  paymentId,
  expectedOrderId,
  expectedAmountPaise,
}: {
  paymentId: string;
  expectedOrderId: string;
  expectedAmountPaise: number;
}): Promise<CapturedPayment | UncapturedPayment> {
  const payment = (await razorpay().payments.fetch(paymentId)) as unknown as {
    status?: string;
    amount?: number | string;
    order_id?: string;
    method?: string;
    error_description?: string;
  };

  const status = String(payment.status ?? 'unknown');

  if (payment.order_id !== expectedOrderId) {
    return {
      captured: false,
      status,
      reason: `Payment belongs to a different order (${payment.order_id ?? 'none'}).`,
    };
  }

  if (status !== 'captured') {
    return {
      captured: false,
      status,
      reason:
        status === 'authorized'
          ? 'Payment is authorised but not captured, so no money has been taken.'
          : payment.error_description ?? `Payment is in state "${status}".`,
    };
  }

  const amountPaise = Number(payment.amount ?? 0);
  if (amountPaise !== expectedAmountPaise) {
    return {
      captured: false,
      status,
      reason: `Amount paid (${amountPaise}) does not match the order (${expectedAmountPaise}).`,
    };
  }

  return { captured: true, amountPaise, method: payment.method };
}
