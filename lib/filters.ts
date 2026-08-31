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
    // Everything not reserved is treated as an attribute filter, so a new
    // filterable attribute needs no change here — ?fabric=Khadi+Cotton and
    // ?sleeve-type=Full+Sleeve are read the same way.
    attributeFilters: parseAttributeFilters(searchParams),
    ...priceBandFor(get('band')),
    limit: page * PER_PAGE,
  };
}

/**
 * Params the list view owns. Anything else on the URL is a filter, so these
 * are held apart rather than filters being enumerated — the point of the
 * attribute system is that nothing here knows their names.
 */
const RESERVED = new Set(['page', 'sort', 'band', 'in_stock', 'discounted', 'category', 'q']);

/**
 * Attribute filters off the URL: `?fabric=Khadi+Cotton&fabric=Chanderi`.
 *
 * Repeatable per attribute, which is what makes a filter an OR within itself
 * — someone happy with khadi or chanderi ticks both.
 */
export function parseAttributeFilters(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(searchParams)) {
    if (RESERVED.has(key) || raw === undefined) continue;
    if (!ATTRIBUTE_SLUG.test(key)) continue;
    const values = parseFilterValues(raw);
    if (values.length > 0) out[key] = values;
  }
  return out;
}

const ATTRIBUTE_SLUG = /^[a-z][a-z0-9-]{0,40}$/;

/**
 * Filter values off the URL, checked by shape rather than by enumeration.
 *
 * Values are typed by the shop, so there is no list to check them against.
 * A fabric nobody listed still appears in the panel, having come from the
 * products themselves, and has to survive the round trip.
 *
 * The value still lands in a database `in (...)` clause, so it is not simply
 * passed through — anything that is not a plain name is rejected, and the
 * count is capped so a crafted URL cannot turn one request into a thousand
 * predicates.
 */
const FILTER_VALUE = /^[\p{L}\p{N}][\p{L}\p{N} .&'"/-]{0,48}$/u;

export function parseFilterValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const wanted = Array.isArray(value) ? value : [value];
  return wanted
    .filter((v): v is string => typeof v === 'string' && FILTER_VALUE.test(v))
    .slice(0, 20);
}
