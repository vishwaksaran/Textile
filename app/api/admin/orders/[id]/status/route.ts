import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { getOrderWithItems, updateOrder } from '@/lib/orders';
import { sendWhatsAppDelivered } from '@/lib/notifications/whatsapp';
import { appUrl } from '@/lib/config';
import { shortOrderId } from '@/lib/utils';
import type { NotifyResult } from '@/lib/notifications/whatsapp';
import type { OrderStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STATUSES: OrderStatus[] = ['processing', 'shipped', 'delivered', 'cancelled'];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const status = body?.status as OrderStatus | undefined;

    if (!status || !STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const existing = await getOrderWithItems(params.id);
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const order = await updateOrder(params.id, { order_status: status });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Only on the transition into `delivered`, never on a re-save of a status
    // the order already held — otherwise correcting an unrelated field would
    // message the customer again about a parcel they received days ago.
    let notification: NotifyResult | null = null;
    if (status === 'delivered' && existing.order_status !== 'delivered') {
      notification = await sendWhatsAppDelivered({
        phone: existing.customer_phone,
        customerName: existing.customer_name,
        orderId: shortOrderId(existing.id),
        invoiceUrl: appUrl(`/api/invoice/${existing.id}`),
      }).catch((err) => ({
        sent: false,
        error: err instanceof Error ? err.message : 'send failed',
      }));

      // A failed or unapproved template must not undo the status change. The
      // order is delivered whether or not Meta accepted the message, and the
      // outcome is reported so the admin can see what happened.
      if (notification && !notification.sent) {
        console.error('[whatsapp] delivered notice not sent', notification);
      }
    }

    return NextResponse.json({ order, notification });
  } catch (err) {
    return errorResponse(err);
  }
}
