import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const { searchParams } = new URL(request.url);

    let query = supabase
      .from('orders')
      .select('*, order_items (id, quantity, price_at_time)', { count: 'exact' });

    const status = searchParams.get('status');
    if (status && status !== 'all') query = query.eq('order_status', status);

    const payment = searchParams.get('payment');
    if (payment && payment !== 'all') query = query.eq('payment_status', payment);

    const from = searchParams.get('from');
    if (from) query = query.gte('created_at', from);

    const to = searchParams.get('to');
    if (to) query = query.lte('created_at', to);

    const search = searchParams.get('q')?.trim();
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_email.ilike.%${search}%`,
      );
    }

    const limit = Math.min(Number(searchParams.get('limit') ?? 50) || 50, 200);
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return NextResponse.json({ orders: data, total: count ?? data?.length ?? 0 });
  } catch (err) {
    return errorResponse(err);
  }
}
