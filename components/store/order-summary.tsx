'use client';

import Image from 'next/image';
import { cartTotals } from '@/stores/cart-store';
import { COMMERCE } from '@/lib/config';
import type { ShippingSettings } from '@/lib/shipping';
import { formatINR } from '@/lib/utils';
import type { CartItem } from '@/types';

interface OrderSummaryProps {
  items: CartItem[];
  /** Renders the line items above the totals (checkout sidebar). */
  showItems?: boolean;
  /** Destination, once known. Absent means the rate shown is an estimate. */
  state?: string | null;
  shippingSettings?: ShippingSettings;
  children?: React.ReactNode;
}

export function OrderSummary({
  items,
  showItems = false,
  state,
  shippingSettings,
  children,
}: OrderSummaryProps) {
  const { subtotal, savings, shipping, shippingQuote, total } = cartTotals(
    items,
    state,
    shippingSettings,
  );
  const threshold = shippingSettings?.freeThreshold ?? COMMERCE.freeShippingThreshold;
  const away = Math.max(threshold - subtotal, 0);

  return (
    <section
      aria-label="Order summary"
      className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6"
    >
      <h2 className="mb-5 font-headline-md text-headline-md text-deep-maroon">Order Summary</h2>

      {showItems && (
        <ul className="mb-5 space-y-4 border-b border-outline-variant/40 pb-5">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3">
              <div className="relative h-16 w-12 flex-none overflow-hidden rounded bg-surface-variant">
                {item.image && (
                  <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-body-md text-sm text-on-surface">{item.name}</p>
                <p className="font-body-md text-xs text-on-surface-variant">
                  Qty {item.quantity}
                </p>
              </div>
              <span className="font-body-md text-sm text-on-surface">
                {formatINR(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="space-y-2 font-body-md text-sm">
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">Subtotal</dt>
          <dd className="text-on-surface">{formatINR(subtotal)}</dd>
        </div>
        {savings > 0 && (
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Discount</dt>
            <dd className="text-success">− {formatINR(savings)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">
            Shipping
            {/* Named so the charge is explainable rather than arbitrary — a
                delivery fee that appears without reason invites a refund
                request. Absent until a state is chosen, since before that the
                figure really is only an estimate. */}
            {shippingQuote.zoneLabel && shipping > 0 && (
              <span className="block text-xs text-on-surface-variant/80">
                to {shippingQuote.zoneLabel}
              </span>
            )}
          </dt>
          <dd className={shipping === 0 ? 'text-success' : 'text-on-surface'}>
            {shipping === 0 ? 'Free' : formatINR(shipping)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-outline-variant/40 pt-3">
          <dt className="font-headline-md text-[18px] text-deep-maroon">Total</dt>
          <dd className="font-body-lg text-[18px] font-bold tabular-nums text-deep-maroon">{formatINR(total)}</dd>
        </div>
      </dl>

      {away > 0 && (
        <p className="mt-4 rounded bg-primary-container/15 px-3 py-2 font-body-md text-xs text-on-surface-variant">
          Add {formatINR(away)} more to qualify for free shipping.
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}
