'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { COMMERCE } from '@/lib/config';
import { quoteShipping, type ShippingSettings } from '@/lib/shipping';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Set once the persisted cart has rehydrated, so SSR and client agree. */
  hydrated: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;

  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => { ok: boolean; reason?: string };
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  /** Reconciles the cart against live stock; returns human-readable changes. */
  reconcile: (levels: Record<string, { stock: number; price: number; name: string }>) => string[];
  setHydrated: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      add: (item, quantity = 1) => {
        if (item.maxStock <= 0) return { ok: false, reason: 'This piece is sold out.' };

        const existing = get().items.find((i) => i.productId === item.productId);
        const desired = (existing?.quantity ?? 0) + quantity;
        const ceiling = Math.min(item.maxStock, COMMERCE.maxQuantityPerItem);

        if (desired > ceiling) {
          if ((existing?.quantity ?? 0) >= ceiling) {
            return {
              ok: false,
              reason:
                item.maxStock <= COMMERCE.maxQuantityPerItem
                  ? `Only ${item.maxStock} left in stock.`
                  : `Limit of ${COMMERCE.maxQuantityPerItem} per order.`,
            };
          }
          // Clamp to the ceiling — inserting the row when this is a first add,
          // rather than only updating rows that already exist.
          set((s) => ({
            items: existing
              ? s.items.map((i) =>
                  i.productId === item.productId ? { ...i, ...item, quantity: ceiling } : i,
                )
              : [...s.items, { ...item, quantity: ceiling }],
          }));
          return {
            ok: true,
            reason:
              item.maxStock <= COMMERCE.maxQuantityPerItem
                ? `Adjusted to the ${ceiling} available.`
                : `Limited to ${ceiling} per order.`,
          };
        }

        set((s) => ({
          items: existing
            ? s.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: desired, ...item } : i,
              )
            : [...s.items, { ...item, quantity }],
        }));
        return { ok: true };
      },

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            if (i.productId !== productId) return [i];
            const ceiling = Math.min(i.maxStock, COMMERCE.maxQuantityPerItem);
            const next = Math.min(Math.max(quantity, 0), ceiling);
            return next === 0 ? [] : [{ ...i, quantity: next }];
          }),
        })),

      clear: () => set({ items: [] }),

      reconcile: (levels) => {
        const notes: string[] = [];
        const items = get().items.flatMap((item) => {
          const live = levels[item.productId];
          if (!live || live.stock <= 0) {
            notes.push(`${item.name} is now sold out and was removed.`);
            return [];
          }
          let next = item;
          if (item.quantity > live.stock) {
            notes.push(`${item.name}: only ${live.stock} left — quantity reduced.`);
            next = { ...next, quantity: live.stock };
          }
          if (live.price !== item.price) {
            notes.push(`${item.name}: price updated.`);
            next = { ...next, price: live.price };
          }
          return [{ ...next, maxStock: live.stock }];
        });
        set({ items });
        return notes;
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'sls-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // Always fires, even with an empty store, so the badge can stop
      // rendering its SSR placeholder.
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

// --------------------------------------------------------------- selectors
export const selectCount = (s: CartState) =>
  s.items.reduce((total, i) => total + i.quantity, 0);

export const selectSubtotal = (s: CartState) =>
  s.items.reduce((total, i) => total + i.price * i.quantity, 0);

export const selectSavings = (s: CartState) =>
  s.items.reduce(
    (total, i) => total + Math.max((i.originalPrice ?? i.price) - i.price, 0) * i.quantity,
    0,
  );

/**
 * Cart arithmetic for display.
 *
 * `state` and `settings` are optional because the drawer and the cart page
 * genuinely cannot know the destination yet — they quote the default rate as
 * an estimate. The checkout page passes both, and what it shows is then the
 * same figure the server independently arrives at before charging.
 */
export function cartTotals(
  items: CartItem[],
  state?: string | null,
  settings?: ShippingSettings,
) {
  const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
  const savings = items.reduce(
    (t, i) => t + Math.max((i.originalPrice ?? i.price) - i.price, 0) * i.quantity,
    0,
  );
  // Pieces, not lines: two of the same saree is still two parcels' worth of
  // cloth, and the courier charges for both.
  const pieces = items.reduce((t, i) => t + i.quantity, 0);
  const quote = quoteShipping(subtotal, state, settings, pieces);
  return {
    subtotal,
    savings,
    shipping: quote.amount,
    shippingQuote: quote,
    total: subtotal + quote.amount,
  };
}
