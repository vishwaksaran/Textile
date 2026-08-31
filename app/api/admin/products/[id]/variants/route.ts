import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { getAllProductVariants, getOptionDetails } from '@/lib/variants';

export const dynamic = 'force-dynamic';

/**
 * The combinations already saved for a product, and the photographs and
 * measurements hanging off individual values.
 *
 * The axes themselves are not here: the form reads those from
 * /api/admin/attributes, which it already refetches whenever the collection
 * changes — and which is the only source that can answer for a product that
 * has not been created yet.
 *
 * Retired combinations are included — the admin needs to see that a Green XL
 * exists and is off sale — and each is marked with whether it has ever been
 * ordered, which is what decides between deleting it and retiring it.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();

    const [variants, optionDetails] = await Promise.all([
      getAllProductVariants(params.id),
      getOptionDetails(params.id),
    ]);

    const soldIds = new Set<string>();
    if (variants.length > 0) {
      const { data: sold } = await supabase
        .from('order_items')
        .select('variant_id')
        .in(
          'variant_id',
          variants.map((v) => v.id),
        );
      for (const row of sold ?? []) soldIds.add(String(row.variant_id));
    }

    return NextResponse.json({
      variants: variants.map((v) => ({ ...v, sold: soldIds.has(v.id) })),
      optionDetails,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
