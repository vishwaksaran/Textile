import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/data';
import { getProductVariants } from '@/lib/variants';
import { effectivePrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Live stock + price, called right before an item goes into the cart. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Read again rather than reusing the product's copy: this endpoint exists
  // precisely because the page may be cached, and a size can sell out inside
  // the same second a shopper spends choosing it.
  const variants = await getProductVariants(product.id);

  return NextResponse.json(
    {
      id: product.id,
      stock_quantity: product.is_sold_out ? 0 : product.stock_quantity,
      is_sold_out: product.is_sold_out || product.stock_quantity <= 0,
      price: effectivePrice(product),
      variants: variants.map((v) => ({
        id: v.id,
        label: v.label,
        stock_quantity: v.stock_quantity,
        // Null would read as "free" at the call site; the product's own
        // price is what a size without one costs.
        price: v.price ?? effectivePrice(product),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
