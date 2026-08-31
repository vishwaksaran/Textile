'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { COMMERCE } from '@/lib/config';
import { quoteShipping, type ShippingSettings } from '@/lib/shipping';
import type { CartItem } from '@/types';

/**
 * A cart line is a product *and* a size.
 *
 * An M and an L of the same churidar are two rows, not one row of two, so
 * every mutation is addressed by this key rather than by product alone.
 * Null collapses to the product id, which is exactly what the key was before
 * sizes existed — the reason old persisted carts still work.
 */
export const lineKey = (productId: string, variantId?: string | null) =>
  variantId ? `${productId}:${variantId}` : productId;

const keyOf = (item: Pick<CartItem, 'productId' | 'variantId'>) =>
  lineKey(item.productId, item.variantId);

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Set once the persisted cart has rehydrated, so SSR and client agree. */
  hydrated: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;

  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => { ok: boolean; reason?: string };
  /** Addressed by lineKey(productId, variantId) — see above. */
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
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

        const key = keyOf(item);
        const existing = get().items.find((i) => keyOf(i) === key);
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
              ? s.items.map((i) => (keyOf(i) === key ? { ...i, ...item, quantity: ceiling } : i))
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
            ? s.items.map((i) => (keyOf(i) === key ? { ...i, quantity: desired, ...item } : i))
            : [...s.items, { ...item, quantity }],
        }));
        return { ok: true };
      },

      remove: (key) => set((s) => ({ items: s.items.filter((i) => keyOf(i) !== key) })),

      setQuantity: (key, quantity) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            if (keyOf(i) !== key) return [i];
            const ceiling = Math.min(i.maxStock, COMMERCE.maxQuantityPerItem);
            const next = Math.min(Math.max(quantity, 0), ceiling);
            return next === 0 ? [] : [{ ...i, quantity: next }];
          }),
        })),

      clear: () => set({ items: [] }),

      reconcile: (levels) => {
        const notes: string[] = [];
        const items = get().items.flatMap((item) => {
          // Keyed by line, so an M selling out does not empty the L as well.
          const live = levels[keyOf(item)];
          const label = item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name;
          if (!live || live.stock <= 0) {
            notes.push(`${label} is now sold out and was removed.`);
            return [];
          }
          let next = item;
          if (item.quantity > live.stock) {
            notes.push(`${label}: only ${live.stock} left — quantity reduced.`);
            next = { ...next, quantity: live.stock };
          }
          if (live.price !== item.price) {
            notes.push(`${label}: price updated.`);
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
      version: 1,
      /*
        Carts saved before sizes existed have no variantId, and every lookup
        here reads one. Filling it in on rehydrate is cheaper than defending
        against undefined at each call site, and a null variant is precisely
        what those lines meant.
      */
      migrate: (persisted) => {
        const state = persisted as { items?: Partial<CartItem>[] } | undefined;
        return {
          items: (state?.items ?? []).map((i) => ({
            ...i,
            variantId: i.variantId ?? null,
            variantLabel: i.variantLabel ?? null,
          })),
        } as { items: CartItem[] };
      },
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
