'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/store/quantity-selector';
import { OrderSummary } from '@/components/store/order-summary';
import { Skeleton } from '@/components/shared/skeleton';
import { lineKey, useCartStore } from '@/stores/cart-store';
import { COMMERCE } from '@/lib/config';
import { formatINR } from '@/lib/utils';

/** Full-page cart, kept in sync with live stock on mount. */
export function CartView() {
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hydrated);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const reconcile = useCartStore((s) => s.reconcile);

  React.useEffect(() => {
    if (!hydrated || items.length === 0) return;
    // Two sizes of one piece are one product to this call.
    const ids = [...new Set(items.map((i) => i.productId))];
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: ids }),
        });
        if (!res.ok || cancelled) return;
        const { levels } = await res.json();
        const notes = reconcile(levels);
        notes.forEach((note) => toast.warning(note));
      } catch {
        // Offline or transient — the checkout re-validates before payment.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once per mount; quantity edits do not need a re-check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="container-page grid grid-cols-1 gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-5 py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-outline-variant" strokeWidth={1} />
        <h1 className="font-headline-lg text-headline-lg text-deep-maroon">Your cart is empty</h1>
        <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
          Nothing here yet. Every piece in our collection is woven by hand, in limited numbers.
        </p>
        <Button asChild size="lg" shine className="mt-2">
          <Link href="/collections">Browse collections</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page grid grid-cols-1 gap-10 py-10 lg:grid-cols-[1fr_360px] lg:gap-gutter">
      <div>
        <h1 className="mb-8 font-headline-lg text-headline-lg text-deep-maroon">
          Your Cart <span className="text-on-surface-variant">({items.length})</span>
        </h1>

        <ul className="divide-y divide-outline-variant/40 border-y border-outline-variant/40">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const key = lineKey(item.productId, item.variantId);
              return (
              <motion.li
                key={key}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-4 py-6 sm:gap-6"
              >
                <Link
                  href={`/product/${item.productId}`}
                  className="relative h-32 w-24 flex-none overflow-hidden rounded bg-surface-variant sm:h-40 sm:w-32"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div>
                    <Link
                      href={`/product/${item.productId}`}
                      className="font-headline-md text-[18px] text-deep-maroon hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel && (
                      <p className="mt-0.5 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                        Size {item.variantLabel}
                      </p>
                    )}
                    <p className="mt-1 font-body-md text-body-md text-on-surface">
                      {formatINR(item.price)}
                      {item.originalPrice && (
                        <span className="ml-2 text-sm text-on-surface-variant/80 line-through">
                          {formatINR(item.originalPrice)}
                        </span>
                      )}
                    </p>
                    {item.maxStock <= 3 && (
                      <p className="mt-1 font-body-md text-xs text-earthy-bronze">
                        Only {item.maxStock} left in stock
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <QuantitySelector
                      value={item.quantity}
                      max={Math.min(item.maxStock, COMMERCE.maxQuantityPerItem)}
                      onChange={(next) => setQuantity(key, next)}
                      label={`Quantity for ${item.name}${item.variantLabel ? ` size ${item.variantLabel}` : ''}`}
                    />
                    <div className="flex items-center gap-4">
                      <span className="font-body-md text-[17px] font-semibold tabular-nums text-deep-maroon">
                        {formatINR(item.price * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(key)}
                        aria-label={`Remove ${item.name}${item.variantLabel ? ` size ${item.variantLabel}` : ''}`}
                        className="rounded p-2 text-on-surface-variant transition-colors hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <div className="mt-8">
          <Button asChild variant="ghost">
            <Link href="/collections">← Continue shopping</Link>
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-28 lg:h-fit">
        <OrderSummary items={items}>
          <Button asChild size="lg" shine className="w-full">
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>
        </OrderSummary>
      </div>
    </div>
  );
}
