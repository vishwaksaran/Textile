import { NextResponse } from 'next/server';
import {
  confirmPaymentCaptured,
  isRazorpayConfigured,
  toPaise,
  verifyPaymentSignature,
} from '@/lib/razorpay';
import { getOrderByRazorpayOrderId, updateOrder } from '@/lib/orders';
import { fulfilPaidOrder } from '@/lib/fulfilment';

export const dynamic = 'force-dynamic';
// Invoice rendering and three outbound APIs need more than the default.
export const maxDuration = 60;

interface Body {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  /** Our own order id, sent back so a failed payment can be marked. */
  orderId?: string;
  failed?: boolean;
  reason?: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // ---------------------------------------------------- payment failed path
  if (body.failed) {
    if (body.orderId) {
      await updateOrder(body.orderId, { payment_status: 'failed' }).catch(() => null);
    }
    console.warn('[razorpay] payment failed', {
      orderId: body.orderId,
      reason: body.reason,
    });
    return NextResponse.json({ success: false, recorded: true });
  }

  const { razorpay_order_id: rzpOrderId, razorpay_payment_id: paymentId } = body;
  if (!rzpOrderId || !paymentId) {
    return NextResponse.json({ error: 'Missing payment reference.' }, { status: 400 });
  }

  const order = await getOrderByRazorpayOrderId(rzpOrderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  // Demo mode has no signature to check; it is only reachable when the store
  // has no Razorpay keys at all, so it cannot be used to bypass a real one.
  const isDemo = !isRazorpayConfigured && rzpOrderId.startsWith('demo_');

  if (!isDemo) {
    const signature = body.razorpay_signature;
    if (
      !signature ||
      !verifyPaymentSignature({ orderId: rzpOrderId, paymentId, signature })
    ) {
      await updateOrder(order.id, { payment_status: 'failed' }).catch(() => null);
      console.error('[razorpay] signature mismatch', { rzpOrderId, paymentId });
      return NextResponse.json(
        { error: 'Payment could not be verified.' },
        { status: 400 },
      );
    }
  }

  // The signature proves the response was not forged. It does not prove the
  // money moved — a payment can carry a valid signature while sitting
  // authorised, or after a retry that never completed. Ask Razorpay what
  // actually happened before treating the shop as paid, because everything
  // downstream is irreversible in the customer's eyes: stock is committed, an
  // invoice is issued and a receipt goes out over WhatsApp.
  if (!isDemo) {
    const outcome = await confirmPaymentCaptured({
      paymentId,
      expectedOrderId: rzpOrderId,
      expectedAmountPaise: toPaise(Number(order.total_amount)),
    }).catch((err) => {
      console.error('[razorpay] could not confirm payment state', err);
      return null;
    });

    if (!outcome) {
      // Reaching Razorpay failed. Do not fulfil on an assumption, and do not
      // mark the order failed either — the payment may well be good.
      return NextResponse.json(
        {
          error:
            'We could not confirm that payment with the bank. Do not pay again — we will check and contact you.',
        },
        { status: 503 },
      );
    }

    if (!outcome.captured) {
      await updateOrder(order.id, { payment_status: 'failed' }).catch(() => null);
      console.warn('[razorpay] payment not captured', {
        rzpOrderId,
        paymentId,
        status: outcome.status,
        reason: outcome.reason,
      });
      return NextResponse.json(
        { error: 'That payment did not complete. Please try again.' },
        { status: 400 },
      );
    }
  }

  try {
    const report = await fulfilPaidOrder(order.id, paymentId);
    return NextResponse.json({
      success: true,
      orderId: report.order.id,
      alreadyProcessed: report.alreadyProcessed,
      invoiceUrl: report.invoiceUrl,
      stockWarnings: report.stockFailures,
      notifications: {
        adminEmail: report.adminEmail,
        customerEmail: report.customerEmail,
        customerWhatsApp: report.customerWhatsApp,
        customerSms: report.customerSms,
      },
    });
  } catch (err) {
    // The money has already moved, so never report this as a payment failure.
    console.error('[razorpay] fulfilment error', err);
    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        warning:
          'Payment received. Some post-payment steps did not complete; our team has been alerted.',
      },
      { status: 200 },
    );
  }
}
