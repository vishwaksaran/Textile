import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/data';
import { effectivePrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Live stock + price, called right before an item goes into the cart. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: product.id,
      stock_quantity: product.is_sold_out ? 0 : product.stock_quantity,
      is_sold_out: product.is_sold_out || product.stock_quantity <= 0,
      price: effectivePrice(product),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
