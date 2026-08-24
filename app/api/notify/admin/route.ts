import { NextResponse } from 'next/server';
import { assertInternalCaller } from '@/lib/auth';
import { getOrderWithItems } from '@/lib/orders';
import { sendAdminOrderEmail } from '@/lib/notifications/email';

export const dynamic = 'force-dynamic';

/** Re-sends the admin new-order email, e.g. after an email outage. */
export async function POST(request: Request) {
  if (!(await assertInternalCaller(request))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const order = await getOrderWithItems(body.orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const result = await sendAdminOrderEmail(order);
  return NextResponse.json(result, { status: result.sent ? 200 : 202 });
}
