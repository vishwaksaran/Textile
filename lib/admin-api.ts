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
