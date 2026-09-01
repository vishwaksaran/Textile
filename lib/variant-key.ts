import type { ProductVariant } from '@/types';

/**
 * How a combination of axis values is named and identified.
 *
 * Its own file, with no server-only import, because the browser has to agree
 * with the database about which combination a shopper has picked: the picker
 * resolves a selection to a variant by building the same key the server wrote.
 * Two implementations of this would disagree eventually, and the first anyone
 * would hear of it is a shopper unable to add a size that is plainly in stock.
 */

/**
 * Sorted by slug and lowercased, so the same pair of values produces the same
 * key however the form happened to order them, and Green does not sit beside
 * green.
 */
export function optionKey(options: Record<string, string>): string {
  return Object.entries(options)
    .filter(([, value]) => value != null && String(value).trim())
    .map(([slug, value]) => [slug, String(value).trim().toLowerCase()] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, value]) => `${slug}:${value}`)
    .join('|');
}

/** 'Green / M' — what a shopper reads, and what the invoice prints. */
export function variantLabel(
  options: Record<string, string>,
  axisSlugs: string[],
): string {
  const ordered = axisSlugs.length
    ? axisSlugs.map((slug) => options[slug]).filter(Boolean)
    : Object.values(options).filter(Boolean);
  return ordered.join(' / ');
}

export interface VariantAxis {
  slug: string;
  name: string;
  /** Values this product actually stocks, in the shop's order. */
  values: string[];
}

/**
 * The axes a product actually offers, built from its variants.
 *
 * Derived rather than taken from the category, so a piece entered in green
 * and red only ever offers green and red — never the shop's whole colour list
 * with fourteen of them struck through.
 *
 * Values follow the attribute's own option order, which is the shop's answer
 * to how sizes run. Without it the chips come out in whatever order the grid
 * happened to create them, and a size row reads "M, XL, XXL, L".
 */
export function axesForProduct(
  variants: ProductVariant[],
  definitions: { slug: string; name: string; order?: string[] }[],
): VariantAxis[] {
  return definitions
    .map(({ slug, name, order = [] }) => {
      const values = [
        ...new Set(
          variants.map((v) => v.options[slug]).filter((value): value is string => Boolean(value)),
        ),
      ];

      const rank = (value: string) => {
        const index = order.indexOf(value);
        // Anything the shop typed by hand and never added to the attribute
        // sorts after the listed values rather than jumping to the front.
        return index === -1 ? order.length : index;
      };

      return {
        slug,
        name,
        values: values.sort(
          (a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }),
        ),
      };
    })
    .filter((axis) => axis.values.length > 0);
}
