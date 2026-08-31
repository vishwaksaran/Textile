import 'server-only';

import { createPublicSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '@/lib/demo-data';
import { effectivePrice } from '@/lib/utils';
import { upgradeImageUrl, upgradeImageUrls } from '@/lib/images';
import type { HeroSlideRow, Category, Product } from '@/types';

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export interface ProductQuery {
  categorySlug?: string;
  search?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  discountedOnly?: boolean;
  /** Match any of these fabrics — the "Material" filter. */
  fabrics?: string[];
  limit?: number;
  offset?: number;
}

const PRODUCT_COLUMNS = '*, categories:category_id (id, name, slug)';

/**
 * Rows may carry CDN URLs saved without a size suffix — from the seed, or
 * pasted into the admin form — which would serve a small rendition. Upgrade
 * them once, here, so every consumer gets full-resolution art.
 */
function withHiResImages<T extends { images?: string[] | null }>(row: T): T {
  return { ...row, images: upgradeImageUrls(row.images) };
}

function withHiResCover<T extends { image_url?: string | null }>(row: T): T {
  return { ...row, image_url: upgradeImageUrl(row.image_url ?? null) };
}

/** Falls back to the bundled catalogue whenever Supabase is unavailable. */
export const usingDemoData = !isSupabaseConfigured;

export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return DEMO_CATEGORIES;

  const { data, error } = await supabase.from('categories').select('*').order('created_at');
  if (error || !data) return DEMO_CATEGORIES;
  return (data as Category[]).map(withHiResCover);
}

/**
 * Fabrics actually present in a listing, for the Material filter.
 *
 * Deliberately ignores the fabric filter itself: the options have to stay
 * put while you tick them, and a facet computed from already-filtered rows
 * would delete every choice but the one just made. Category and stock still
 * apply, so a filter can never offer something that returns nothing.
 */
export async function getAvailableFabrics(categorySlug?: string): Promise<string[]> {
  const supabase = createPublicSupabase();

  if (!supabase) {
    const list = categorySlug
      ? DEMO_PRODUCTS.filter((p) => p.categories?.slug === categorySlug)
      : DEMO_PRODUCTS;
    return [...new Set(list.map((p) => p.fabric).filter((f): f is string => Boolean(f)))].sort();
  }

  let query = supabase
    .from('products')
    .select('fabric')
    .eq('is_active', true)
    .not('fabric', 'is', null);

  if (categorySlug) {
    const ids = await categoryIdsFor(categorySlug);
    if (ids && ids.length === 0) return [];
    if (ids) query = query.in('category_id', ids);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const fabrics = (data as { fabric: string | null }[])
    .map((r) => r.fabric)
    .filter((f): f is string => Boolean(f));
  return [...new Set(fabrics)].sort();
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createPublicSupabase();
  if (!supabase) return DEMO_CATEGORIES.find((c) => c.slug === slug) ?? null;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return null;
  return data ? withHiResCover(data as Category) : null;
}

function sortDemo(list: Product[], sort: ProductSort): Product[] {
  const copy = [...list];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case 'price-desc':
      return copy.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case 'newest':
      return copy.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    default:
      // "Featured" keeps in-stock pieces first, then newest.
      return copy.sort(
        (a, b) =>
          Number(a.is_sold_out) - Number(b.is_sold_out) ||
          +new Date(b.created_at) - +new Date(a.created_at),
      );
  }
}

function queryDemo(q: ProductQuery): { products: Product[]; total: number } {
  let list = DEMO_PRODUCTS.filter((p) => p.is_active);

  if (q.categorySlug) list = list.filter((p) => p.categories?.slug === q.categorySlug);
  if (q.search) {
    const needle = q.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? '').toLowerCase().includes(needle),
    );
  }
  if (q.minPrice != null) list = list.filter((p) => effectivePrice(p) >= q.minPrice!);
  if (q.maxPrice != null) list = list.filter((p) => effectivePrice(p) <= q.maxPrice!);
  if (q.inStockOnly) list = list.filter((p) => !p.is_sold_out && p.stock_quantity > 0);
  if (q.discountedOnly)
    list = list.filter((p) => p.discounted_price != null && p.discounted_price < p.price);
  if (q.fabrics?.length)
    list = list.filter((p) => p.fabric != null && q.fabrics!.includes(p.fabric));

  const total = list.length;
  const sorted = sortDemo(list, q.sort ?? 'featured');
  const offset = q.offset ?? 0;
  const limit = q.limit ?? sorted.length;
  return { products: sorted.slice(offset, offset + limit), total };
}

/**
 * A category and everything filed beneath it.
 *
 * A section holds no products of its own — pieces live in its subcategories —
 * so filtering /category/sarees on category_id alone would return an empty
 * page for the busiest link in the menu. One level of nesting is all the tree
 * has, so this resolves children rather than recursing.
 */
async function categoryIdsFor(slug: string): Promise<string[] | null> {
  const supabase = createPublicSupabase();
  if (!supabase) return null;

  const category = await getCategoryBySlug(slug);
  if (!category) return [];

  const { data } = await supabase.from('categories').select('id').eq('parent_id', category.id);
  return [category.id, ...((data as { id: string }[]) ?? []).map((c) => c.id)];
}

export async function getProducts(q: ProductQuery = {}): Promise<{
  products: Product[];
  total: number;
}> {
  const supabase = createPublicSupabase();
  if (!supabase) return queryDemo(q);

  let categoryIds: string[] | undefined;
  if (q.categorySlug) {
    const ids = await categoryIdsFor(q.categorySlug);
    if (ids && ids.length === 0) return { products: [], total: 0 };
    categoryIds = ids ?? undefined;
  }

  let query = supabase
    .from('products')
    .select(PRODUCT_COLUMNS, { count: 'exact' })
    .eq('is_active', true);

  if (categoryIds) query = query.in('category_id', categoryIds);
  if (q.search) query = query.ilike('name', `%${q.search}%`);
  if (q.minPrice != null) query = query.gte('price', q.minPrice);
  if (q.maxPrice != null) query = query.lte('price', q.maxPrice);
  if (q.inStockOnly) query = query.gt('stock_quantity', 0);
  if (q.discountedOnly) query = query.not('discounted_price', 'is', null);
  if (q.fabrics?.length) query = query.in('fabric', q.fabrics);

  switch (q.sort) {
    case 'price-asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query
        .order('is_sold_out', { ascending: true })
        .order('created_at', { ascending: false });
  }

  const offset = q.offset ?? 0;
  if (q.limit != null) query = query.range(offset, offset + q.limit - 1);

  const { data, error, count } = await query;
  if (error || !data) return { products: [], total: 0 };

  return {
    products: (data as unknown as Product[]).map(withHiResImages),
    total: count ?? data.length,
  };
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createPublicSupabase();
  if (!supabase) return DEMO_PRODUCTS.find((p) => p.id === id) ?? null;

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) return null;
  return data ? withHiResImages(data as unknown as Product) : null;
}

export async function getRelatedProducts(product: Product, limit = 6): Promise<Product[]> {
  const { products } = await getProducts({
    categorySlug: product.categories?.slug,
    limit: limit + 1,
  });
  const related = products.filter((p) => p.id !== product.id).slice(0, limit);
  if (related.length >= 3) return related;

  // Thin category — top up with the newest pieces from the rest of the store.
  const { products: fallback } = await getProducts({ sort: 'newest', limit: limit + 4 });
  const seen = new Set([product.id, ...related.map((p) => p.id)]);
  return [...related, ...fallback.filter((p) => !seen.has(p.id))].slice(0, limit);
}

export async function getLatestProducts(limit = 8): Promise<Product[]> {
  const { products } = await getProducts({ sort: 'newest', limit });
  return products;
}

/** Live stock lookup used to re-validate a cart right before payment. */
export async function getStockLevels(
  productIds: string[],
): Promise<Record<string, { stock: number; price: number; name: string }>> {
  if (productIds.length === 0) return {};
  const supabase = createPublicSupabase();

  if (!supabase) {
    return Object.fromEntries(
      DEMO_PRODUCTS.filter((p) => productIds.includes(p.id)).map((p) => [
        p.id,
        { stock: p.stock_quantity, price: effectivePrice(p), name: p.name },
      ]),
    );
  }

  const { data } = await supabase
    .from('products')
    .select('id, name, price, discounted_price, stock_quantity, is_active')
    .in('id', productIds);

  return Object.fromEntries(
    (data ?? [])
      .filter((p) => p.is_active)
      .map((p) => [
        p.id,
        {
          stock: p.stock_quantity ?? 0,
          price: effectivePrice(p as Product),
          name: p.name as string,
        },
      ]),
  );
}

/**
 * Banner slides for the home page, newest configuration first.
 *
 * Returns an empty array rather than throwing when the table is missing or
 * unreachable — the caller falls back to a built-in set, so a database
 * hiccup costs the shop its custom banner, not its whole front page.
 */
export async function getHeroSlides(): Promise<HeroSlideRow[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as HeroSlideRow[]).map((row) => ({
    ...row,
    image_url: upgradeImageUrl(row.image_url),
  }));
}
