'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge, EmptyState } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { formatDate, formatINR, shortOrderId } from '@/lib/utils';
import type { Order } from '@/types';

const STATUSES = ['all', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const PAYMENTS = ['all', 'paid', 'pending', 'failed'] as const;

/** Filters are URL-driven so the server re-queries and views stay shareable. */
export function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = React.useState(params.get('q') ?? '');

  const update = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update('q', term);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, phone, email or tracking ID"
            aria-label="Search orders"
            className="w-full rounded border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 font-body-md text-sm focus:border-deep-maroon focus:outline-none focus:ring-0"
          />
        </form>

        <select
          value={params.get('status') ?? 'all'}
          onChange={(e) => update('status', e.target.value)}
          aria-label="Filter by order status"
          className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm capitalize focus:border-deep-maroon focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Any status' : s}
            </option>
          ))}
        </select>

        <select
          value={params.get('payment') ?? 'all'}
          onChange={(e) => update('payment', e.target.value)}
          aria-label="Filter by payment status"
          className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm capitalize focus:border-deep-maroon focus:outline-none"
        >
          {PAYMENTS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Any payment' : s}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label htmlFor="from" className="sr-only">
            From date
          </label>
          <input
            id="from"
            type="date"
            value={params.get('from')?.slice(0, 10) ?? ''}
            onChange={(e) => update('from', e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm focus:border-deep-maroon focus:outline-none"
          />
          <span className="font-body-md text-sm text-on-surface-variant">to</span>
          <label htmlFor="to" className="sr-only">
            To date
          </label>
          <input
            id="to"
            type="date"
            value={params.get('to')?.slice(0, 10) ?? ''}
            onChange={(e) => update('to', e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm focus:border-deep-maroon focus:outline-none"
          />
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders match"
          body="Clear the filters, or wait for the next order — paid orders appear here within seconds."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface-container-low">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-body-md text-sm font-semibold text-deep-maroon hover:underline"
                    >
                      #{shortOrderId(order.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-body-md text-sm text-on-surface">
                    {order.customer_name}
                    <span className="block text-xs text-on-surface-variant">
                      {order.customer_city ?? ''} · {order.customer_phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body-md text-sm text-on-surface-variant">
                    {order.order_items?.reduce((n, i) => n + i.quantity, 0) ?? 0}
                  </td>
                  <td className="px-4 py-3 font-body-md text-sm text-on-surface">
                    {formatINR(Number(order.total_amount))}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={order.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.order_status} />
                  </td>
                  <td className="px-4 py-3 font-body-md text-xs text-on-surface-variant">
                    {order.tracking_id ? (
                      <>
                        {order.tracking_id}
                        <span className="block opacity-70">{order.courier_name}</span>
                      </>
                    ) : (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/orders/${order.id}#tracking`}>Add</Link>
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body-md text-sm text-on-surface-variant">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body-md text-xs text-on-surface-variant">
        Showing {orders.length} orders (most recent first, capped at 200).
      </p>
    </div>
  );
}
