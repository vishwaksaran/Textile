'use client';

import { create } from 'zustand';
import { optionKey, withForcedValues, type VariantAxis } from '@/lib/variant-key';
import type { OptionDetail, Product, ProductVariant } from '@/types';

/**
 * Which combination the shopper has picked, per product.
 *
 * A store rather than component state because three things on the product
 * page need the same answer — the picker, the gallery and the sticky mobile
 * bar — and they are siblings with the whole page between them. A colour
 * chosen in one that the others did not hear about is how someone ends up
 * looking at green photographs while buying a red one.
 *
 * Not persisted. A choice belongs to this visit; stock moves, and a
 * remembered selection that has since sold out is worse than none.
 */
interface VariantState {
  /** productId → attribute slug → value. */
  selected: Record<string, Record<string, string>>;
  select: (productId: string, slug: string, value: string | null) => void;
}

const EMPTY: Record<string, string> = {};

export const useVariantStore = create<VariantState>()((set) => ({
  selected: {},
  select: (productId, slug, value) =>
    set((s) => {
      const current = { ...(s.selected[productId] ?? {}) };
      if (value === null) delete current[slug];
      else current[slug] = value;
      return { selected: { ...s.selected, [productId]: current } };
    }),
}));

export function useSelectedOptions(productId: string): Record<string, string> {
  return useVariantStore((s) => s.selected[productId]) ?? EMPTY;
}

/**
 * What the shopper has chosen, plus everything that was never theirs to
 * choose — see withForcedValues.
 *
 * Every reader of a selection goes through this, so the picker, the buy
 * button and the gallery cannot disagree about whether a piece stocked in one
 * colour has had its colour decided.
 */
export function useEffectiveOptions(
  productId: string,
  axes: VariantAxis[],
): Record<string, string> {
  const selected = useSelectedOptions(productId);
  return withForcedValues(selected, axes);
}

/**
 * The variant the current selection names, or null while it is incomplete.
 *
 * Matched on the same normalised key the database stores, built by shared
 * code, so the browser and the server cannot disagree about which shelf a
 * shopper is pointing at.
 */
export function useSelectedVariant(
  productId: string,
  variants: ProductVariant[] | undefined,
  axes: VariantAxis[],
): ProductVariant | null {
  const selected = useEffectiveOptions(productId, axes);
  if (!variants?.length || axes.length === 0) return null;
  if (axes.some((axis) => !selected[axis.slug])) return null;

  const key = optionKey(
    Object.fromEntries(axes.map((axis) => [axis.slug, selected[axis.slug]])),
  );
  return variants.find((v) => v.option_key === key) ?? null;
}

/**
 * The photographs to show right now.
 *
 * An axis value may carry its own — colour almost always does — and the first
 * chosen value that has any wins. Falling back to the product's own set is
 * what makes an axis like size, which does not change how a piece looks,
 * cost nothing here.
 */
export function useActiveImages(
  product: Pick<Product, 'id' | 'images'>,
  optionDetails: Record<string, OptionDetail> | undefined,
  axes: VariantAxis[],
): string[] {
  const selected = useEffectiveOptions(product.id, axes);
  if (!optionDetails) return product.images ?? [];

  for (const axis of axes) {
    const value = selected[axis.slug];
    if (!value) continue;
    const images = optionDetails[`${axis.slug}:${value}`]?.images;
    if (images?.length) return images;
  }
  return product.images ?? [];
}
