import 'server-only';

import { createAdminSupabase, createPublicSupabase } from '@/lib/supabase/server';
import type { ProductVariant } from '@/types';

/**
 * Sizes.
 *
 * The whole feature rests on one rule: a product with no rows here behaves
 * exactly as it did before variants existed. Every function in this file
 * returns an empty array rather than throwing when there are none, so a
 * saree takes the same path it always has.
 */

/** Shaped rather than trusted: measurements is free-form jsonb in the table. */
function shape(row: Record<string, unknown>): ProductVariant {
  const raw = row.measurements;
  const measurements: Record<string, string> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value == null || value === '') continue;
      measurements[key] = String(value);
    }
  }

  return {
    id: String(row.id),
    product_id: String(row.product_id),
    label: String(row.label),
    sku: (row.sku as string | null) ?? null,
    stock_quantity: Number(row.stock_quantity ?? 0),
    price: row.price == null ? null : Number(row.price),
    measurements,
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
  };
}

const bySortOrder = (a: ProductVariant, b: ProductVariant) =>
  a.sort_order - b.sort_order || a.label.localeCompare(b.label, undefined, { numeric: true });

/** Sizes offered to a shopper: active ones only, in the shop's order. */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(shape).sort(bySortOrder);
}

/** Every size including retired ones, for the admin's product form. */
export async function getAllProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = createAdminSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(shape).sort(bySortOrder);
}

export interface VariantDraft {
  id?: string;
  label: string;
  sku?: string | null;
  stock_quantity: number;
  price?: number | null;
  measurements?: Record<string, string>;
  is_active?: boolean;
}

/**
 * Replaces a product's sizes with exactly what the form submitted.
 *
 * Rows the admin removed are deleted, not deactivated — but only when no
 * order has ever referenced them. A size that has been sold keeps its row and
 * is deactivated instead, so `order_items.variant_id` still resolves and the
 * shop can look up what it shipped.
 *
 * An empty list means the admin removed every size, and is honoured. "The
 * form sent no variants" and "this product never had any" are
 * indistinguishable from in here, so the caller must not call this at all for
 * a request that never carried a variants field.
 */
export async function saveProductVariants(
  productId: string,
  drafts: VariantDraft[],
): Promise<void> {
  const supabase = createAdminSupabase();
  if (!supabase) return;

  const { data: existingRows } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);

  const existing = new Set((existingRows ?? []).map((r) => String(r.id)));
  const kept = new Set(drafts.map((d) => d.id).filter((id): id is string => Boolean(id)));
  const removed = [...existing].filter((id) => !kept.has(id));

  if (removed.length > 0) {
    const { data: sold } = await supabase
      .from('order_items')
      .select('variant_id')
      .in('variant_id', removed);

    const soldIds = new Set((sold ?? []).map((r) => String(r.variant_id)));
    const deletable = removed.filter((id) => !soldIds.has(id));

    if (deletable.length > 0) {
      await supabase.from('product_variants').delete().in('id', deletable);
    }
    if (soldIds.size > 0) {
      await supabase
        .from('product_variants')
        .update({ is_active: false, stock_quantity: 0 })
        .in('id', [...soldIds]);
    }
  }

  // Position comes from the order the admin arranged them in, not from a
  // number they have to maintain by hand.
  const rows = drafts.map((draft, index) => ({
    id: draft.id,
    product_id: productId,
    label: draft.label.trim(),
    sku: draft.sku?.trim() || null,
    stock_quantity: Math.max(0, Math.trunc(draft.stock_quantity)),
    price: draft.price == null || Number.isNaN(draft.price) ? null : draft.price,
    measurements: draft.measurements ?? {},
    sort_order: (index + 1) * 10,
    is_active: draft.is_active !== false,
  }));

  /*
    Split, because PostgREST rejects a bulk write whose rows do not all carry
    the same keys — and a form that adds one size to three existing ones sends
    exactly that: three rows with an id and one without. New rows are inserted
    so the database mints their ids; the rest are upserted on the primary key.
  */
  const added = rows.filter((r) => !r.id).map(({ id: _id, ...rest }) => rest);
  const updated = rows.filter((r) => r.id);

  const failures = await Promise.all([
    added.length > 0 ? supabase.from('product_variants').insert(added) : null,
    updated.length > 0 ? supabase.from('product_variants').upsert(updated) : null,
  ]);

  for (const result of failures) {
    if (!result?.error) continue;
    // The unique index on (product_id, label) is the one an admin can trip.
    throw new Error(
      result.error.code === '23505'
        ? 'Two sizes share a label, or a SKU is already used by another piece.'
        : result.error.message,
    );
  }
}

/**
 * Sizes submitted with the product, or undefined when the form never carried
 * them. Undefined and [] mean different things here: the first is "leave the
 * sizes alone", the second is "the admin removed every one".
 */
export function parseVariantDrafts(body: { variants?: unknown }): VariantDraft[] | undefined {
  if (!Array.isArray(body.variants)) return undefined;

  return (body.variants as Record<string, unknown>[])
    .map((v) => ({
      id: typeof v.id === 'string' && v.id ? v.id : undefined,
      label: String(v.label ?? '').trim(),
      sku: v.sku ? String(v.sku).trim() : null,
      stock_quantity: Math.max(0, Math.trunc(Number(v.stock_quantity) || 0)),
      price:
        v.price === null || v.price === undefined || v.price === '' || Number.isNaN(Number(v.price))
          ? null
          : Number(v.price),
      measurements:
        v.measurements && typeof v.measurements === 'object' && !Array.isArray(v.measurements)
          ? Object.fromEntries(
              Object.entries(v.measurements as Record<string, unknown>).map(([k, value]) => [
                k,
                String(value ?? ''),
              ]),
            )
          : {},
    }))
    .filter((v) => v.label.length > 0);
}
