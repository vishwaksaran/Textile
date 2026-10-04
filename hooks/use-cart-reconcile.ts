'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useCartStore } from '@/stores/cart-store';

/**
 * Corrects the cart's prices and stock against the shop's live figures.
 *
 * The cart remembers the price a piece had when it was added. Every screen
 * that shows a cart total — the drawer, /cart and checkout — runs this, so
 * none of them can show a price the shop has since changed. One copy of the
 * check, because three hand-written ones drifted: the drawer had none, and a
 * piece repriced from Rs. 3,000 to Rs. 3 kept showing Rs. 3,000 there.
 *
 * Runs whenever `active` turns true (the drawer opening, a page mounting),
 * not on every quantity change.
 */
export function useCartReconcile(active = true) {
  const hydrated = useCartStore((s) => s.hydrated);
  const reconcile = useCartStore((s) => s.reconcile);

  React.useEffect(() => {
    if (!active || !hydrated) return;
    const items = useCartStore.getState().items;
    if (items.length === 0) return;

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
        const notes = reconcile((await res.json()).levels);
        notes.forEach((note) => toast.warning(note));
      } catch {
        // Offline — the server re-prices before creating the payment anyway.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, hydrated, reconcile]);
}
