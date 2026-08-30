'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Select } from '@/components/ui/input';
import type { Order, OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = ['processing', 'shipped', 'delivered', 'cancelled'];

export function OrderStatusControl({ order }: { order: Order }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<OrderStatus>(order.order_status);
  const [busy, setBusy] = React.useState(false);

  async function change(next: OrderStatus) {
    const previous = status;
    setStatus(next);
    setBusy(true);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(previous);
        toast.error(data.error ?? 'Could not update the status.');
        return;
      }

      // Marking an order delivered messages the customer, so say whether that
      // actually went out — an unapproved template fails quietly otherwise.
      const data = await res.json().catch(() => ({}));
      const notice = data.notification as {
        sent?: boolean;
        error?: string;
        skipped?: string;
      } | null;

      toast.success(`Order marked ${next}.`, {
        description: notice
          ? notice.sent
            ? 'The customer was told on WhatsApp that it arrived.'
            : `WhatsApp notice not sent: ${notice.error ?? notice.skipped ?? 'unknown reason'}`
          : undefined,
      });
      router.refresh();
    } catch {
      setStatus(previous);
      toast.error('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor="order-status"
        className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
      >
        Order status
      </label>
      <Select
        id="order-status"
        value={status}
        disabled={busy}
        onChange={(e) => void change(e.target.value as OrderStatus)}
        className="capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
    </div>
  );
}
