import { NextResponse } from 'next/server';
import { assertInternalCaller } from '@/lib/auth';
import { getOrderWithItems } from '@/lib/orders';
import { sendAdminOrderEmail } from '@/lib/notifications/email';
import { buildInvoicePdf } from '@/lib/invoice';
import { taxForOrder } from '@/lib/tax-settings';

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

  /*
    Rebuilt here so a re-send is the same email as the original.
    Without it this route quietly sent a copy with no invoice attached —
    which is precisely the thing someone re-sending after an outage is
    trying to get hold of.
  */
  let pdf: Uint8Array | undefined;
  try {
    pdf = buildInvoicePdf(order, await taxForOrder(order));
  } catch {
    // The email is worth more than the attachment; /api/invoice/[id] still
    // regenerates it on demand.
  }

  const result = await sendAdminOrderEmail(order, pdf);
  return NextResponse.json(result, { status: result.sent ? 200 : 202 });
}
