'use client';

import { create } from 'zustand';
import type { ProductVariant } from '@/types';

/**
 * Which size the shopper has picked, per product.
 *
 * A store rather than component state because two things on the product page
 * need the same answer — the buy box and the sticky mobile bar, which are
 * siblings with the page between them — and a size chosen in one that the
 * other did not know about is how a shopper ends up buying the wrong one.
 *
 * Not persisted. A size is a decision about this visit; stock moves, and a
 * remembered choice that has since sold out is worse than no choice at all.
 */
interface VariantState {
  selected: Record<string, string | null>;
  select: (productId: string, variantId: string | null) => void;
}

export const useVariantStore = create<VariantState>()((set) => ({
  selected: {},
  select: (productId, variantId) =>
    set((s) => ({ selected: { ...s.selected, [productId]: variantId } })),
}));

/**
 * The chosen variant, or null.
 *
 * Resolved against the list the page was rendered with rather than held as an
 * object, so a stale id — a size retired between two visits in one session —
 * simply reads as "nothing chosen" instead of a phantom selection.
 */
export function useSelectedVariant(
  productId: string,
  variants: ProductVariant[] | undefined,
): ProductVariant | null {
  const id = useVariantStore((s) => s.selected[productId]);
  if (!id || !variants) return null;
  return variants.find((v) => v.id === id) ?? null;
}
