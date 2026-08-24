import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { getOrderByRazorpayOrderId, updateOrder } from '@/lib/orders';
import { fulfilPaidOrder } from '@/lib/fulfilment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Redundant confirmation path. If the customer closes the tab before the
 * verify call lands, Razorpay's `payment.captured` webhook still completes
 * the order. Fulfilment is idempotent, so both paths are safe.
 *
 * Configure at Razorpay Dashboard → Webhooks with RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; error_description?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id || !payment.id) {
    return NextResponse.json({ received: true, ignored: 'no payment entity' });
  }

  const order = await getOrderByRazorpayOrderId(payment.order_id);
  if (!order) {
    return NextResponse.json({ received: true, ignored: 'unknown order' });
  }

  if (event.event === 'payment.failed') {
    await updateOrder(order.id, { payment_status: 'failed' }).catch(() => null);
    return NextResponse.json({ received: true, marked: 'failed' });
  }

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const report = await fulfilPaidOrder(order.id, payment.id);
    return NextResponse.json({
      received: true,
      alreadyProcessed: report.alreadyProcessed,
    });
  }

  return NextResponse.json({ received: true, ignored: event.event });
}
