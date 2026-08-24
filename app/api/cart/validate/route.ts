import { NextResponse } from 'next/server';
import { getStockLevels } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Returns live stock and price for the ids in a cart, so it can self-heal. */
export async function POST(request: Request) {
  let productIds: unknown;
  try {
    ({ productIds } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(productIds) || productIds.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'productIds must be an array of strings' }, { status: 400 });
  }
  if (productIds.length > 50) {
    return NextResponse.json({ error: 'Too many products in one request' }, { status: 400 });
  }

  const levels = await getStockLevels(productIds as string[]);
  return NextResponse.json({ levels }, { headers: { 'Cache-Control': 'no-store' } });
}
