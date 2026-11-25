import 'server-only';

import { revalidatePath } from 'next/cache';

/**
 * Pushes a catalogue change onto the storefront immediately.
 *
 * The storefront pages are statically generated with a `revalidate` window —
 * an hour on the home, category and product pages — which is what
 * makes them fast. The cost is that an edit in the admin is invisible until
 * that window lapses: setting a sold-out piece back to 2 in stock left the
 * category page still showing SOLD OUT, and a shop owner reasonably reads
 * that as the save having failed.
 *
 * Stock is the worst thing to serve stale in either direction. Too high and a
 * customer reaches checkout for something that is gone; too low and a piece
 * that is on the shelf cannot be bought.
 *
 * So rather than shortening the windows — which would cost a rebuild on every
 * visitor for data that usually has not changed — the pages keep their long
 * revalidate and the writer clears them on the way out. Cheap, because it only
 * happens when something actually changed.
 *
 * Never throws. A failed revalidation must not turn a successful save into an
 * error response: the row is already written, and the page would recover on
 * its own within the revalidate window anyway.
 */
export function revalidateCatalogue(options: {
  productId?: string | null;
  categorySlug?: string | null;
} = {}): void {
  // /budget-sarees lists products and /shipping prints the shipping rates;
  // both sit on the same hour-long window, so both are cleared here too.
  const paths = ['/', '/collections', '/budget-sarees', '/shipping', '/llms.txt'];

  if (options.categorySlug) paths.push(`/category/${options.categorySlug}`);
  if (options.productId) paths.push(`/product/${options.productId}`);

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.error(`[revalidate] could not clear ${path}`, err);
    }
  }

  // A product can move between collections, and a stock change alters the
  // "sold out" badge on every listing it appears in, so the category layer is
  // cleared wholesale rather than guessing which slugs are affected.
  try {
    revalidatePath('/category/[slug]', 'page');
  } catch (err) {
    console.error('[revalidate] could not clear the category pages', err);
  }

  // A save with no product named (a collection, the shipping rates, the
  // banner) can still change what every product page prints — its
  // breadcrumb, its delivery note — so those are cleared too. Admin edits of
  // that kind are rare; a sale names its products and never reaches here.
  if (!options.productId) {
    try {
      revalidatePath('/product/[id]', 'page');
    } catch (err) {
      console.error('[revalidate] could not clear the product pages', err);
    }
  }
}
