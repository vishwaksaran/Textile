import 'server-only';
import { requireAdminSupabase } from '@/lib/supabase/server';

import { NextResponse } from 'next/server';
import { UnauthorisedError } from '@/lib/auth';

/** Shared error shaping for every /api/admin route. */
export function errorResponse(err: unknown) {
  if (err instanceof UnauthorisedError) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : 'Something went wrong';
  console.error('[admin-api]', err);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function validateProduct(body: Record<string, unknown>): string | null {
  if (!body.name || String(body.name).trim().length < 2) return 'A product name is required.';

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) return 'Enter a price greater than zero.';

  if (body.discounted_price != null && body.discounted_price !== '') {
    const discounted = Number(body.discounted_price);
    if (!Number.isFinite(discounted) || discounted <= 0) return 'Enter a valid discounted price.';
    if (discounted >= price) return 'The discounted price must be lower than the price.';
  }

  const stock = Number(body.stock_quantity ?? 0);
  if (!Number.isInteger(stock) || stock < 0) {
    return 'Stock must be zero or a positive whole number.';
  }
  return null;
}

export function validateCategory(body: Record<string, unknown>): string | null {
  if (!body.name || String(body.name).trim().length < 2) return 'A category name is required.';
  if (!body.slug || !/^[a-z0-9-]+$/.test(String(body.slug))) {
    return 'The slug may only contain lowercase letters, numbers and hyphens.';
  }
  return null;
}

/**
 * Records which of a category's attributes create variants for it.
 *
 * Ticking Colour has to create the assignment as well as the flag: an
 * attribute cannot vary a category that was never asked to describe it, and
 * making the shop do both in two places is how one of them gets forgotten.
 *
 * Unticking clears the flag but keeps the assignment, so colour goes back to
 * being a description rather than disappearing from the form altogether.
 */
export async function saveVariantAttributes(
  categoryId: string,
  slugs: unknown,
): Promise<void> {
  if (!Array.isArray(slugs)) return;

  const supabase = requireAdminSupabase();
  const wanted = new Set((slugs as unknown[]).map((s) => String(s)));

  const { data: attributes } = await supabase.from('attributes').select('id, slug');
  const rows = (attributes as { id: string; slug: string }[] | null) ?? [];
  if (rows.length === 0) return;

  const assign = rows.filter((a) => wanted.has(a.slug));
  if (assign.length > 0) {
    await supabase.from('category_attributes').upsert(
      assign.map((a) => ({
        category_id: categoryId,
        attribute_id: a.id,
        is_variant: true,
      })),
      { onConflict: 'category_id,attribute_id' },
    );
  }

  const clear = rows.filter((a) => !wanted.has(a.slug)).map((a) => a.id);
  if (clear.length > 0) {
    await supabase
      .from('category_attributes')
      .update({ is_variant: false })
      .eq('category_id', categoryId)
      .in('attribute_id', clear);
  }
}

/**
 * Deletes collections, and everything filed beneath them.
 *
 * Deleting a section takes its subcategories with it — a section without its
 * children is not a thing the tree can represent, and leaving them behind
 * would silently promote five weaves to top-level menu items.
 *
 * Products are the one thing this will not take. `category_id` is nullable,
 * so the database would happily let the delete through and leave the pieces
 * uncategorised: still live, still for sale, and absent from every collection
 * page. The shop is told to move them instead.
 *
 * Shared by the single delete and the bulk one, so the warning a shop reads
 * in the confirmation cannot describe something different from what happens.
 */
export async function deleteCategorySubtree(
  ids: string[],
): Promise<{ deleted: number } | { error: string }> {
  const supabase = requireAdminSupabase();

  const { data: all } = await supabase.from('categories').select('id, name, parent_id');
  const rows = (all as { id: string; name: string; parent_id: string | null }[] | null) ?? [];

  /*
    Walked rather than assumed one level deep. The tree is two levels today
    and this stops being right the moment it is not — quietly leaving a
    grandchild parented to a row that no longer exists.
  */
  const subtree = new Set(ids);
  for (let added = true; added; ) {
    added = false;
    for (const row of rows) {
      if (row.parent_id && subtree.has(row.parent_id) && !subtree.has(row.id)) {
        subtree.add(row.id);
        added = true;
      }
    }
  }

  const doomed = [...subtree];

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .in('category_id', doomed);

  if ((count ?? 0) > 0) {
    const names = rows
      .filter((r) => subtree.has(r.id))
      .map((r) => r.name)
      .join(', ');
    return {
      error: `${count} ${count === 1 ? 'piece is' : 'pieces are'} filed under ${names}. Move them to another collection first.`,
    };
  }

  /*
    Children before parents. parent_id is `on delete restrict`, so one delete
    covering both would be refused depending on the order Postgres happened to
    process the rows.
  */
  const depth = (id: string): number => {
    let level = 0;
    let current = rows.find((r) => r.id === id)?.parent_id ?? null;
    while (current) {
      level += 1;
      current = rows.find((r) => r.id === current)?.parent_id ?? null;
    }
    return level;
  };

  for (const id of [...doomed].sort((a, b) => depth(b) - depth(a))) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  return { deleted: doomed.length };
}
