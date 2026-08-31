import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

/**
 * Moves one category up or down among its siblings.
 *
 * Swapping sort_order with the neighbour, rather than renumbering the whole
 * list, so two admins reordering different parts of the tree at once cannot
 * overwrite each other's positions.
 *
 * Siblings are those sharing a parent, which is what makes "up" mean
 * something: a subcategory moves within its section, never out of it and
 * never past a top-level row.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const id = String(body.id ?? '');
    const direction = body.direction === 'up' ? 'up' : 'down';
    if (!id) return NextResponse.json({ error: 'Which category?' }, { status: 400 });

    const { data: row } = await supabase
      .from('categories')
      .select('id, parent_id, sort_order')
      .eq('id', id)
      .maybeSingle();

    if (!row) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const current = row as { id: string; parent_id: string | null; sort_order: number };

    let siblings = supabase
      .from('categories')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    // `is('parent_id', null)` and `eq` are different queries; a top-level row
    // must not be compared against every subcategory in the catalogue.
    siblings =
      current.parent_id === null
        ? siblings.is('parent_id', null)
        : siblings.eq('parent_id', current.parent_id);

    const { data: list } = await siblings;
    const ordered = (list as { id: string; sort_order: number }[]) ?? [];
    const index = ordered.findIndex((c) => c.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;

    // Already at the end: nothing to swap with, and no error to report.
    if (index === -1 || target < 0 || target >= ordered.length) {
      return NextResponse.json({ moved: false });
    }

    const neighbour = ordered[target];

    if (neighbour.sort_order !== current.sort_order) {
      // The ordinary path: two rows trade numbers, touching nothing else, so
      // a reorder elsewhere in the tree at the same moment still lands.
      await Promise.all([
        supabase.from('categories').update({ sort_order: neighbour.sort_order }).eq('id', id),
        supabase
          .from('categories')
          .update({ sort_order: current.sort_order })
          .eq('id', neighbour.id),
      ]);
    } else {
      // Tied rows are ordered by name, so trading equal numbers would leave
      // them exactly where they were and the arrow would look broken. Space
      // the whole sibling list out by tens first — in the order the admin is
      // looking at — and the swap has somewhere to happen. Self-healing: it
      // only ever runs on a list that has lost its spacing.
      const spaced = ordered.map((c, i) => ({ ...c, sort_order: (i + 1) * 10 }));
      const a = spaced[index];
      const b = spaced[target];
      [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];

      await Promise.all(
        spaced.map((c) =>
          supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', c.id),
        ),
      );
    }

    revalidateCatalogue();
    return NextResponse.json({ moved: true });
  } catch (err) {
    return errorResponse(err);
  }
}
