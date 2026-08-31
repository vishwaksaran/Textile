import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { getAllProductVariants } from '@/lib/variants';

export const dynamic = 'force-dynamic';

/**
 * A product's sizes, for the form.
 *
 * Retired sizes are included — the admin needs to see that an XL exists and
 * is off sale — and each is marked with whether it has ever been ordered,
 * which is what decides between deleting it and retiring it.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();

    const variants = await getAllProductVariants(params.id);
    if (variants.length === 0) return NextResponse.json({ variants: [] });

    const { data: sold } = await supabase
      .from('order_items')
      .select('variant_id')
      .in(
        'variant_id',
        variants.map((v) => v.id),
      );

    const soldIds = new Set((sold ?? []).map((row) => String(row.variant_id)));

    return NextResponse.json({
      variants: variants.map((v) => ({ ...v, sold: soldIds.has(v.id) })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
