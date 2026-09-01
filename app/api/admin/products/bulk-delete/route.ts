import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

/** One accidental click should not be able to empty a catalogue. */
const MAX = 100;

/**
 * Deletes several pieces at once, by the same rule the single delete uses:
 * a piece that appears in a past order is retired rather than removed, so
 * order history keeps the name of what was actually shipped.
 *
 * The two outcomes are counted separately and reported, because "5 deleted"
 * when two of them are still in the catalogue as hidden rows would be a lie
 * the shop only discovers later.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const ids = Array.isArray(body.ids)
      ? [...new Set((body.ids as unknown[]).map(String).filter(Boolean))]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Nothing selected.' }, { status: 400 });
    }
    if (ids.length > MAX) {
      return NextResponse.json(
        { error: `Select ${MAX} or fewer at a time.` },
        { status: 400 },
      );
    }

    // One query rather than one per piece: the answer is the same, and a
    // hundred round trips inside a request is how a bulk action times out.
    const { data: ordered } = await supabase
      .from('order_items')
      .select('product_id')
      .in('product_id', ids);

    const sold = new Set((ordered ?? []).map((row) => String(row.product_id)));
    const removable = ids.filter((id) => !sold.has(id));
    const retirable = ids.filter((id) => sold.has(id));

    if (retirable.length > 0) {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', retirable);
      if (error) throw new Error(error.message);
    }

    if (removable.length > 0) {
      // Variants, attribute values and option details all cascade.
      const { error } = await supabase.from('products').delete().in('id', removable);
      if (error) throw new Error(error.message);
    }

    revalidateCatalogue();

    return NextResponse.json({
      deleted: removable.length,
      retired: retirable.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
