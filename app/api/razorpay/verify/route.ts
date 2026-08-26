import { NextResponse } from 'next/server';
import { isRazorpayConfigured, verifyPaymentSignature } from '@/lib/razorpay';
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
