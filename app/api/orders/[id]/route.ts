import { NextResponse } from 'next/server';
import { getOrderWithItems } from '@/lib/orders';
import { appUrl, generateCourierTrackingUrl } from '@/lib/config';
import { shortOrderId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Public order lookup for the confirmation and tracking pages. The id is a
 * UUID, and the response is deliberately trimmed — no full address, no
 * payment identifiers beyond what the customer already has.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = await getOrderWithItems(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      order: {
        id: order.id,
        shortId: shortOrderId(order.id),
        customerName: order.customer_name,
        customerCity: order.customer_city,
        totalAmount: Number(order.total_amount),
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        trackingId: order.tracking_id,
        courierName: order.courier_name,
        trackingUrl:
          order.tracking_id && order.courier_name
            ? generateCourierTrackingUrl(order.courier_name, order.tracking_id)
            : null,
        invoiceUrl: appUrl(`/api/invoice/${order.id}`),
        createdAt: order.created_at,
        items: (order.order_items ?? []).map((item) => ({
          name: item.products?.name ?? 'Handloom piece',
          image: item.products?.images?.[0] ?? null,
          quantity: item.quantity,
          price: Number(item.price_at_time),
        })),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
