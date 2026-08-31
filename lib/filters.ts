import { formatINR } from '@/lib/utils';
import type { ProductSort } from '@/lib/data';

/** Shared by the client filter UI and the server components that query. */
export const PRICE_BANDS = [
  { label: 'Under ₹10,000', min: 0, max: 10000 as number | undefined },
  { label: '₹10,000 – ₹25,000', min: 10000, max: 25000 as number | undefined },
  { label: '₹25,000 – ₹50,000', min: 25000, max: 50000 as number | undefined },
  { label: 'Above ₹50,000', min: 50000, max: undefined as number | undefined },
];

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export const PER_PAGE = 8;

export function priceBandFor(bandParam?: string): { minPrice?: number; maxPrice?: number } {
  if (!bandParam) return {};
  const band = PRICE_BANDS[Number(bandParam)];
  if (!band) return {};
  return { minPrice: band.min, maxPrice: band.max };
}

export function formatBand(bandParam?: string): string | null {
  if (!bandParam) return null;
  const band = PRICE_BANDS[Number(bandParam)];
  if (!band) return null;
  return band.max
    ? `${formatINR(band.min)} – ${formatINR(band.max)}`
    : `Above ${formatINR(band.min)}`;
}

export function parseSort(value?: string): ProductSort {
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as ProductSort) : 'featured';
}

/** Normalises the store's list-page search params into a data-layer query. */
export function parseListParams(searchParams: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const page = Math.max(1, Number(get('page') ?? '1') || 1);

  return {
    page,
    sort: parseSort(get('sort')),
    band: get('band'),
    inStockOnly: get('in_stock') === '1',
    discountedOnly: get('discounted') === '1',
    categorySlug: get('category'),
    search: get('q'),
    // Repeatable: ?fabric=Khadi+Cotton&fabric=Chanderi. Read from the raw
    // params rather than `get`, which collapses to the first value only.
    fabrics: parseFabrics(searchParams.fabric),
    ...priceBandFor(get('band')),
    limit: page * PER_PAGE,
  };
}

/**
 * Fabric filters off the URL, checked by shape rather than by enumeration.
 *
 * This used to test each value against a fixed list of fabrics. That stopped
 * being correct once the admin could type a fabric nobody had listed: the
 * name would appear in the filter panel, having come from the products
 * themselves, and then be silently dropped here for not being on a list it
 * was never going to be on.
 *
 * The value still lands in a database `in (...)` clause, so it is not simply
 * passed through — anything that is not a plain name is rejected, and the
 * count is capped so a crafted URL cannot turn one request into a thousand
 * predicates.
 */
const FABRIC_NAME = /^[\p{L}][\p{L} .&'-]{0,48}$/u;

export function parseFabrics(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const wanted = Array.isArray(value) ? value : [value];
  return wanted.filter((v): v is string => typeof v === 'string' && FABRIC_NAME.test(v)).slice(0, 20);
}
