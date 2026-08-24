'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/store/quantity-selector';
import { useCartStore, cartTotals } from '@/stores/cart-store';
import { COMMERCE } from '@/lib/config';
import { formatINR } from '@/lib/utils';

/**
 * Slides in from the right on desktop and rises full-screen on mobile.
 * Spring physics on the panel, fade on the scrim.
 */
export function CartDrawer() {
  const router = useRouter();
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  const { subtotal, savings, shipping, total } = cartTotals(items);
  const awayFromFreeShipping = Math.max(COMMERCE.freeShippingThreshold - subtotal, 0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-deep-maroon/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden="true"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="fixed inset-x-0 bottom-0 top-0 z-50 flex w-full flex-col bg-warm-cream sm:left-auto sm:right-0 sm:max-w-md sm:border-l sm:border-primary-container/30"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center justify-between border-b border-outline-variant/40 px-6 py-5">
              <h2 className="font-headline-md text-headline-md text-deep-maroon">Your Cart</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close cart"
                className="-mr-2 rounded p-2 text-on-surface-variant transition-colors hover:text-deep-maroon"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <ShoppingBag className="h-10 w-10 text-outline-variant" strokeWidth={1} />
                <p className="font-headline-md text-headline-md text-deep-maroon">
                  Your cart is empty
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Every piece here was made by hand. Find the one that is yours.
                </p>
                <Button asChild variant="outline" className="mt-2">
                  <Link href="/collections" onClick={close}>
                    Browse collections
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {subtotal < COMMERCE.freeShippingThreshold && (
                    <p className="mb-4 rounded bg-primary-container/15 px-3 py-2 font-body-md text-sm text-on-surface-variant">
                      Add {formatINR(awayFromFreeShipping)} more for free shipping.
                    </p>
                  )}

                  <ul className="space-y-5">
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.li
                          key={item.productId}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.22 }}
                          className="flex gap-4"
                        >
                          <div className="relative h-24 w-20 flex-none overflow-hidden rounded bg-surface-variant">
                            {item.image && (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div>
                              <p className="line-clamp-2 font-body-md text-sm font-semibold text-deep-maroon">
                                {item.name}
                              </p>
                              <p className="mt-1 font-body-md text-sm text-on-surface-variant">
                                {formatINR(item.price)}
                                {item.originalPrice && (
                                  <span className="ml-2 line-through opacity-60">
                                    {formatINR(item.originalPrice)}
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <QuantitySelector
                                size="sm"
                                value={item.quantity}
                                max={Math.min(item.maxStock, COMMERCE.maxQuantityPerItem)}
                                onChange={(next) => setQuantity(item.productId, next)}
                                label={`Quantity for ${item.name}`}
                              />
                              <button
                                type="button"
                                onClick={() => remove(item.productId)}
                                aria-label={`Remove ${item.name}`}
                                className="rounded p-2 text-on-surface-variant transition-colors hover:text-error"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>

                <footer
                  className="border-t border-outline-variant/40 px-6 py-5"
                  style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
                >
                  <dl className="space-y-1.5 font-body-md text-sm">
                    <Row label="Subtotal" value={formatINR(subtotal)} />
                    {savings > 0 && (
                      <Row label="You save" value={`− ${formatINR(savings)}`} accent />
                    )}
                    <Row
                      label="Shipping"
                      value={shipping === 0 ? 'Free' : formatINR(shipping)}
                    />
                    <div className="!mt-3 flex justify-between border-t border-outline-variant/40 pt-3">
                      <dt className="font-headline-md text-[17px] text-deep-maroon">Total</dt>
                      <dd className="font-headline-md text-[17px] text-deep-maroon">
                        {formatINR(total)}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    shine
                    onClick={() => {
                      close();
                      router.push('/checkout');
                    }}
                  >
                    Proceed to checkout
                  </Button>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-3 w-full font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant transition-colors hover:text-deep-maroon"
                  >
                    Continue shopping
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={accent ? 'text-success' : 'text-on-surface'}>{value}</dd>
    </div>
  );
}
