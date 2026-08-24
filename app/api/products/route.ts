import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data';
import { parseSort, priceBandFor } from '@/lib/filters';

export const dynamic = 'force-dynamic';

/** Public catalogue read. Only active products are ever returned. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const { products, total } = await getProducts({
    categorySlug: searchParams.get('category') ?? undefined,
    search: searchParams.get('q') ?? undefined,
    sort: parseSort(searchParams.get('sort') ?? undefined),
    inStockOnly: searchParams.get('in_stock') === '1',
    discountedOnly: searchParams.get('discounted') === '1',
    limit: Math.min(Number(searchParams.get('limit') ?? 24) || 24, 60),
    offset: Math.max(Number(searchParams.get('offset') ?? 0) || 0, 0),
    ...priceBandFor(searchParams.get('band') ?? undefined),
  });

  return NextResponse.json({ products, total });
}
