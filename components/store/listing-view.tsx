import Link from 'next/link';
import { ProductGrid } from '@/components/store/product-grid';
import { FilterPanel, SortControl } from '@/components/store/filter-panel';
import { Button } from '@/components/ui/button';
import { categoryIdsFor, getCategories, getProducts } from '@/lib/data';
import { getFilterFacets } from '@/lib/attributes';
import { PER_PAGE, formatBand, parseListParams } from '@/lib/filters';
import type { Category } from '@/types';

interface ListingViewProps {
  searchParams: Record<string, string | string[] | undefined>;
  /** Locks the listing to one weave (category route); omit on /collections. */
  lockedCategory?: Category;
  /**
   * How many product images to load eagerly.
   *
   * Four is right when the grid is the first thing on the page. Behind a
   * full-height hero none of them are above the fold, and eager-loading four
   * large images there only takes bandwidth from the hero, which is then the
   * LCP element — so the category route passes 0.
   */
  priorityCount?: number;
}

/**
 * The shared grid + filters view behind /collections and /category/[slug].
 * Server-rendered so filtered URLs are crawlable and shareable.
 */
export async function ListingView({
  searchParams,
  lockedCategory,
  priorityCount = 4,
}: ListingViewProps) {
  const parsed = parseListParams(searchParams);
  const categorySlug = lockedCategory?.slug ?? parsed.categorySlug;

  const [{ products, total }, categories, facets] = await Promise.all([
    getProducts({
      categorySlug,
      sort: parsed.sort,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      inStockOnly: parsed.inStockOnly,
      discountedOnly: parsed.discountedOnly,
      search: parsed.search,
      attributeFilters: parsed.attributeFilters,
      limit: parsed.limit,
    }),
    getCategories(),
    // Facets are built from the category's whole subtree, and deliberately
    // ignore the filters already applied — see getFilterFacets.
    categorySlug
      ? categoryIdsFor(categorySlug).then((ids) => getFilterFacets(ids))
      : getFilterFacets(null),
  ]);

  const hasMore = products.length < total;
  const nextParams = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      v == null ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]],
    ),
  );
  nextParams.set('page', String(parsed.page + 1));

  const bandLabel = formatBand(parsed.band);

  return (
    <div className="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[260px_1fr] lg:gap-gutter">
      <FilterPanel
        categories={lockedCategory ? [] : categories}
        activeCategory={categorySlug}
        total={total}
        facets={facets}
      />

      <div className="space-y-6">
        {parsed.search && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-container/40 bg-primary-container/10 px-4 py-3">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {total === 0 ? 'No matches for' : `${total} ${total === 1 ? 'result' : 'results'} for`}{' '}
              <strong className="text-deep-maroon">&ldquo;{parsed.search}&rdquo;</strong>
            </p>
            <Link
              href={lockedCategory ? `/category/${lockedCategory.slug}` : '/collections'}
              className="font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon hover:underline"
            >
              Clear search
            </Link>
          </div>
        )}

        <div className="hidden items-center justify-between gap-4 lg:flex">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Showing {products.length} of {total} {total === 1 ? 'piece' : 'pieces'}
            {bandLabel && <span className="text-earthy-bronze"> · {bandLabel}</span>}
          </p>
          <SortControl />
        </div>

        <p className="font-body-md text-sm text-on-surface-variant lg:hidden">
          {total} {total === 1 ? 'piece' : 'pieces'}
        </p>

        <ProductGrid products={products} priorityCount={priorityCount} />

        {hasMore && (
          <div className="flex justify-center pt-6">
            <Button asChild variant="outline" size="lg">
              <Link href={`?${nextParams.toString()}`} scroll={false} replace>
                Load {Math.min(PER_PAGE, total - products.length)} more
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
