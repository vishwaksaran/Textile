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
