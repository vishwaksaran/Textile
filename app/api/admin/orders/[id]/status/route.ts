import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { updateOrder } from '@/lib/orders';
import type { OrderStatus } from '@/types';

export const dynamic = 'force-dynamic';

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

    const order = await updateOrder(params.id, { order_status: status });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({ order });
  } catch (err) {
    return errorResponse(err);
  }
}
