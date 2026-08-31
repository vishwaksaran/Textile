import 'server-only';

import { requireAdminSupabase } from '@/lib/supabase/server';
import type { Category, Order, Product } from '@/types';

export interface DashboardStats {
  totalOrders: number;
  paidOrders: number;
  revenueMonth: number;
  pendingShipments: number;
  lowStock: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

/** Aggregates for the admin dashboard, read with the service role. */
export async function getDashboardData(): Promise<{
  stats: DashboardStats;
  revenue: RevenuePoint[];
  recentOrders: Order[];
  lowStockProducts: Product[];
}> {
  const supabase = requireAdminSupabase();
  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const [ordersRes, recentRes, lowStockRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_amount, payment_status, order_status, created_at')
      .gte('created_at', since.toISOString()),
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('*, categories:category_id (id, name, slug)')
      .eq('is_active', true)
      .lt('stock_quantity', 5)
      .order('stock_quantity', { ascending: true })
      .limit(10),
  ]);

  const windowOrders = ordersRes.data ?? [];

  // Totals across all time need their own counts, not just the 30-day window.
  const [{ count: totalOrders }, { count: paidOrders }, { count: pendingShipments }] =
    await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'paid'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'paid')
        .eq('order_status', 'processing'),
    ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const revenueMonth = windowOrders
    .filter((o) => o.payment_status === 'paid' && new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  // Build a dense 30-day series so the chart has no gaps.
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    byDay.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const order of windowOrders) {
    if (order.payment_status !== 'paid') continue;
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(order.total_amount ?? 0);
    bucket.orders += 1;
  }

  return {
    stats: {
      totalOrders: totalOrders ?? 0,
      paidOrders: paidOrders ?? 0,
      revenueMonth,
      pendingShipments: pendingShipments ?? 0,
      lowStock: lowStockRes.data?.length ?? 0,
    },
    revenue: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    recentOrders: (recentRes.data ?? []) as Order[],
    lowStockProducts: (lowStockRes.data ?? []) as unknown as Product[],
  };
}

export async function listAdminProducts(): Promise<{
  products: Product[];
  categories: Category[];
}> {
  const supabase = requireAdminSupabase();
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories:category_id (id, name, slug)')
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
  ]);

  return {
    products: (productsRes.data ?? []) as unknown as Product[],
    categories: (categoriesRes.data ?? []) as Category[],
  };
}

export async function listAdminCategories(): Promise<
  (Category & { productCount: number })[]
> {
  const supabase = requireAdminSupabase();
  const [categoriesRes, productsRes] = await Promise.all([
    // Ordered as the storefront menu is, so the reorder arrows in the manager
    // move rows against the order a shopper actually sees.
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('products').select('category_id'),
  ]);

  const counts = new Map<string, number>();
  for (const row of productsRes.data ?? []) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return (categoriesRes.data ?? []).map((c) => ({
    ...(c as Category),
    productCount: counts.get(c.id) ?? 0,
  }));
}

export interface OrderFilters {
  status?: string;
  payment?: string;
  q?: string;
  from?: string;
  to?: string;
}

export async function listAdminOrders(filters: OrderFilters = {}): Promise<Order[]> {
  const supabase = requireAdminSupabase();

  let query = supabase.from('orders').select('*, order_items (id, quantity, price_at_time)');

  if (filters.status && filters.status !== 'all') {
    query = query.eq('order_status', filters.status);
  }
  if (filters.payment && filters.payment !== 'all') {
    query = query.eq('payment_status', filters.payment);
  }
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) {
    // Make the "to" date inclusive of the whole day.
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }
  if (filters.q?.trim()) {
    const term = filters.q.trim();
    query = query.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,customer_email.ilike.%${term}%,tracking_id.ilike.%${term}%`,
    );
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(200);
  return (data ?? []) as Order[];
}
