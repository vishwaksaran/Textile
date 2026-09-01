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

/**
 * The selection, with anything that was never a choice filled in.
 *
 * An axis offering one value is not a question. Leaving it unanswered left
 * the buy button dead at "Select colour and pattern" on a piece stocked in
 * one colour and one pattern, with nothing on the page a shopper could press
 * to satisfy it but the two buttons already in front of them.
 *
 * Derived rather than written into the store on mount: the server renders the
 * same answer the browser does, so the button never flashes from disabled to
 * ready, and there is no state to get out of step with the axes.
 */
export function withForcedValues(
  selected: Record<string, string>,
  axes: VariantAxis[],
): Record<string, string> {
  const forced = axes.filter((axis) => axis.values.length === 1);
  if (forced.length === 0) return selected;

  const next = { ...selected };
  for (const axis of forced) next[axis.slug] = axis.values[0];
  return next;
}

/**
 * The photographs to show for a selection.
 *
 * Every chosen value contributes, in axis order — not just the first one that
 * happens to have any. A saree entered with two photographs of the Maroon
 * cloth and two of the Zari Border showed the Maroon pair and silently
 * dropped the others, because colour is listed first and the search stopped
 * there. Nothing a shop takes the trouble to upload should be unreachable.
 *
 * Deduplicated, since the same shot is easily attached to both a colour and
 * a pattern, and the gallery would otherwise show it twice.
 *
 * The product's own images are the fallback for a selection that carries
 * none, rather than an addition to it: a piece photographed per colour should
 * not trail the generic shot behind every one of them.
 */
export function imagesForSelection(
  selected: Record<string, string>,
  axes: VariantAxis[],
  optionDetails: Record<string, { images: string[] }> | undefined,
  fallback: string[],
): string[] {
  if (!optionDetails) return fallback;

  const gathered: string[] = [];
  for (const axis of axes) {
    const value = selected[axis.slug];
    if (!value) continue;
    for (const image of optionDetails[`${axis.slug}:${value}`]?.images ?? []) {
      if (!gathered.includes(image)) gathered.push(image);
    }
  }

  return gathered.length > 0 ? gathered : fallback;
}
