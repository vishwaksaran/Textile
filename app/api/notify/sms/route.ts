import { NextResponse } from 'next/server';
import { assertInternalCaller } from '@/lib/auth';
import { sendSmsTracking } from '@/lib/notifications/sms';

export const dynamic = 'force-dynamic';

/** Internal only — an admin session or the INTERNAL_API_SECRET header. */
export async function POST(request: Request) {
  if (!(await assertInternalCaller(request))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.phone || !body?.trackingId) {
    return NextResponse.json({ error: 'phone and trackingId are required' }, { status: 400 });
  }

  const result = await sendSmsTracking({
    phone: body.phone,
    orderId: body.orderId ?? '',
    trackingId: body.trackingId,
    courierName: body.courierName ?? 'Courier',
    trackingUrl: body.trackingUrl ?? '',
  });

  return NextResponse.json(result, { status: result.sent ? 200 : 202 });
}
