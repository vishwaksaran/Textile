import Link from 'next/link';
import { AlertTriangle, IndianRupee, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import {
  AdminHeader,
  AdminPage,
  EmptyState,
  OrderStatusBadge,
  PaymentStatusBadge,
  StatCard,
} from '@/components/admin/ui';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { Button } from '@/components/ui/button';
import { getDashboardData } from '@/lib/admin-data';
import { formatDate, formatINR, shortOrderId } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  const { stats, revenue, recentOrders, lowStockProducts } = await getDashboardData();

  return (
    <AdminPage>
      <AdminHeader
        title="Dashboard"
        subtitle="Today at a glance — orders, revenue and what needs attention."
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total orders"
          value={stats.totalOrders}
          hint={`${stats.paidOrders} paid`}
          Icon={ShoppingCart}
          href="/admin/orders"
        />
        <StatCard
          label="Revenue this month"
          value={formatINR(stats.revenueMonth)}
          hint="Paid orders only"
          Icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="Pending shipments"
          value={stats.pendingShipments}
          hint="Paid, not yet shipped"
          Icon={Truck}
          href="/admin/orders?status=processing"
          tone={stats.pendingShipments > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Low stock"
          value={stats.lowStock}
          hint="Fewer than 5 left"
          Icon={AlertTriangle}
          href="/admin/products?stock=low"
          tone={stats.lowStock > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <RevenueChart data={revenue} />

        <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5">
          <h2 className="mb-5 font-headline-md text-headline-md text-deep-maroon">
            Running low
          </h2>
          {lowStockProducts.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              Every active piece has five or more in stock.
            </p>
          ) : (
            <ul className="space-y-3">
              {lowStockProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="min-w-0 flex-1 truncate font-body-md text-sm text-on-surface hover:text-deep-maroon hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span
                    className={`font-label-sm text-label-sm ${
                      product.stock_quantity <= 0 ? 'text-error' : 'text-earthy-bronze'
                    }`}
                  >
                    {product.stock_quantity <= 0 ? 'Sold out' : `${product.stock_quantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-5 py-4">
          <h2 className="font-headline-md text-headline-md text-deep-maroon">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/orders">View all</Link>
          </Button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No orders yet"
              body="When a customer completes checkout, the order will appear here within seconds."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-body-md text-sm font-semibold text-deep-maroon hover:underline"
                      >
                        #{shortOrderId(order.id)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-body-md text-sm text-on-surface">
                      {order.customer_name}
                      <span className="block text-xs text-on-surface-variant">
                        {order.customer_phone}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-body-md text-sm text-on-surface">
                      {formatINR(Number(order.total_amount))}
                    </td>
                    <td className="px-5 py-3">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={order.order_status} />
                    </td>
                    <td className="px-5 py-3 font-body-md text-sm text-on-surface-variant">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 flex items-center gap-2 font-body-md text-xs text-on-surface-variant">
        <PackageCheck className="h-3.5 w-3.5" />
        Tracking notifications go out over WhatsApp, SMS and email from the order detail page.
      </p>
    </AdminPage>
  );
}
