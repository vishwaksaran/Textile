import 'server-only';

import { createAdminSupabase, createPublicSupabase } from '@/lib/supabase/server';
import { getCategoryAttributes, type Attribute } from '@/lib/attributes';
import { optionKey, variantLabel } from '@/lib/variant-key';
import type { OptionDetail, ProductVariant } from '@/types';

/**
 * Variants: one product, several shelves, told apart by attributes.
 *
 * A variant is a combination of values along the axes its category names —
 * colour and size for a churidar, nothing at all for a saree — and each
 * combination carries its own stock, SKU and price.
 *
 * Two rules hold the whole thing together:
 *
 *   A product with no variants behaves exactly as it did before any of this
 *   existed. Every function here returns empty rather than throwing.
 *
 *   The axis values a product's variants use are mirrored into
 *   product_attribute_values, so filters, facets and the spec table keep
 *   reading one place and need to know nothing about variants.
 */

// ---------------------------------------------------------------- the axes

/** The attributes that form variants for a category, in the shop's order. */
export async function getVariantAxes(categoryId: string | null): Promise<Attribute[]> {
  const attributes = await getCategoryAttributes(categoryId);
  return attributes.filter((a) => a.is_variant);
}

// ------------------------------------------------------------- reading them

interface VariantRow {
  id: unknown;
  product_id: unknown;
  label: unknown;
  option_key: unknown;
  sku: unknown;
  stock_quantity: unknown;
  price: unknown;
  sort_order: unknown;
  is_active: unknown;
  images: unknown;
}

function shape(row: VariantRow, options: Record<string, string>): ProductVariant {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    label: String(row.label ?? ''),
    option_key: (row.option_key as string | null) ?? '',
    options,
    sku: (row.sku as string | null) ?? null,
    stock_quantity: Number(row.stock_quantity ?? 0),
    price: row.price == null ? null : Number(row.price),
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
  };
}

const bySortOrder = (a: ProductVariant, b: ProductVariant) =>
  a.sort_order - b.sort_order || a.label.localeCompare(b.label, undefined, { numeric: true });

async function readVariants(
  supabase: NonNullable<ReturnType<typeof createPublicSupabase>>,
  productId: string,
  activeOnly: boolean,
): Promise<ProductVariant[]> {
  let query = supabase.from('product_variants').select('*').eq('product_id', productId);
  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as unknown as VariantRow[];
  if (rows.length === 0) return [];

  /*
    Axis values come back as attribute ids and are turned into slugs here, so
    nothing above this line ever holds an id. One extra round trip, on the one
    page that needs it.
  */
  const [{ data: optionRows }, { data: attrRows }] = await Promise.all([
    supabase
      .from('product_variant_options')
      .select('variant_id, attribute_id, value')
      .in('variant_id', rows.map((r) => String(r.id))),
    supabase.from('attributes').select('id, slug'),
  ]);

  const slugById = new Map(
    ((attrRows as { id: string; slug: string }[]) ?? []).map((a) => [String(a.id), a.slug]),
  );

  const byVariant = new Map<string, Record<string, string>>();
  for (const option of (optionRows as
    | { variant_id: string; attribute_id: string; value: string }[]
    | null) ?? []) {
    const slug = slugById.get(String(option.attribute_id));
    if (!slug) continue;
    const current = byVariant.get(String(option.variant_id)) ?? {};
    current[slug] = option.value;
    byVariant.set(String(option.variant_id), current);
  }

  return rows.map((row) => shape(row, byVariant.get(String(row.id)) ?? {})).sort(bySortOrder);
}

/** Combinations offered to a shopper: active ones only, in the shop's order. */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];
  return readVariants(supabase, productId, true);
}

/** Every combination including retired ones, for the admin's product form. */
export async function getAllProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = createAdminSupabase();
  if (!supabase) return [];
  return readVariants(supabase, productId, false);
}

// ------------------------------------------------- per-value art and figures

/** Keyed `slug:value`, because that is how both callers look one up. */
export async function getOptionDetails(
  productId: string,
): Promise<Record<string, OptionDetail>> {
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return {};

  const [{ data, error }, { data: attrRows }] = await Promise.all([
    supabase
      .from('product_option_details')
      .select('attribute_id, value, images, measurements')
      .eq('product_id', productId),
    supabase.from('attributes').select('id, slug'),
  ]);

  if (error || !data) return {};

  const slugById = new Map(
    ((attrRows as { id: string; slug: string }[]) ?? []).map((a) => [String(a.id), a.slug]),
  );

  const details: Record<string, OptionDetail> = {};
  for (const row of data as {
    attribute_id: string;
    value: string;
    images: string[] | null;
    measurements: Record<string, unknown> | null;
  }[]) {
    const slug = slugById.get(String(row.attribute_id));
    if (!slug) continue;

    const measurements: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.measurements ?? {})) {
      if (value == null || value === '') continue;
      measurements[key] = String(value);
    }

    details[`${slug}:${row.value}`] = {
      attributeSlug: slug,
      value: row.value,
      images: row.images ?? [],
      measurements,
    };
  }
  return details;
}

// ------------------------------------------------------------- writing them

export interface VariantDraft {
  id?: string;
  /** Axis values by attribute slug: { colour: 'Green', size: 'M' }. */
  options: Record<string, string>;
  sku?: string | null;
  stock_quantity: number;
  price?: number | null;
  images?: string[];
  is_active?: boolean;
}

export interface OptionDetailDraft {
  attributeSlug: string;
  value: string;
  images?: string[];
  measurements?: Record<string, string>;
}

/**
 * Replaces a product's variants with exactly what the form submitted.
 *
 * Combinations the admin removed are deleted — unless one has been ordered,
 * in which case it is retired instead, so `order_items.variant_id` still
 * resolves and the shop can look up what it shipped.
 *
 * An empty list means the admin removed every combination, and is honoured.
 * The caller must not call this for a request that never carried the field.
 */
export async function saveProductVariants(
  productId: string,
  drafts: VariantDraft[],
  axes: Attribute[],
): Promise<void> {
  const supabase = createAdminSupabase();
  if (!supabase) return;

  const idBySlug = new Map(axes.map((a) => [a.slug, a.id]));

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

  // Position comes from the order the grid was built in, not from a number
  // anyone maintains by hand.
  const rows = drafts.map((draft, index) => ({
    id: draft.id,
    product_id: productId,
    label: variantLabel(draft.options, axes.map((a) => a.slug)),
    option_key: optionKey(draft.options),
    sku: draft.sku?.trim() || null,
    stock_quantity: Math.max(0, Math.trunc(draft.stock_quantity)),
    price: draft.price == null || Number.isNaN(draft.price) ? null : draft.price,
    images: draft.images ?? [],
    sort_order: (index + 1) * 10,
    is_active: draft.is_active !== false,
  }));

  /*
    Split, because PostgREST rejects a bulk write whose rows do not all carry
    the same keys — and a grid that adds one colour to three existing ones
    sends exactly that. New rows are inserted so the database mints their ids;
    the rest are upserted on the primary key.
  */
  const added = rows.filter((r) => !r.id).map(({ id: _id, ...rest }) => rest);
  const updated = rows.filter((r) => r.id);

  const written: { id: string; option_key: string }[] = [];

  if (added.length > 0) {
    const { data, error } = await supabase
      .from('product_variants')
      .insert(added)
      .select('id, option_key');
    if (error) throw new Error(describeWriteError(error));
    written.push(...((data as { id: string; option_key: string }[]) ?? []));
  }
  if (updated.length > 0) {
    const { data, error } = await supabase
      .from('product_variants')
      .upsert(updated)
      .select('id, option_key');
    if (error) throw new Error(describeWriteError(error));
    written.push(...((data as { id: string; option_key: string }[]) ?? []));
  }

  // ------------------------------------------------------------ axis values
  const idByKey = new Map(written.map((r) => [r.option_key, String(r.id)]));
  const optionRows: { variant_id: string; attribute_id: string; value: string }[] = [];

  for (const draft of drafts) {
    const variantId = draft.id ?? idByKey.get(optionKey(draft.options));
    if (!variantId) continue;
    for (const [slug, value] of Object.entries(draft.options)) {
      const attributeId = idBySlug.get(slug);
      if (!attributeId || !value.trim()) continue;
      optionRows.push({ variant_id: variantId, attribute_id: attributeId, value: value.trim() });
    }
  }

  const variantIds = [...new Set(optionRows.map((r) => r.variant_id))];
  if (variantIds.length > 0) {
    // Cleared first, so an axis the shop stopped varying by leaves no orphan
    // value behind to be matched by a filter.
    await supabase.from('product_variant_options').delete().in('variant_id', variantIds);
    const { error } = await supabase.from('product_variant_options').insert(optionRows);
    if (error) throw new Error(error.message);
  }

  await mirrorAxisValues(productId, drafts, axes);
}

/**
 * Writes the axis values a product's variants use back onto the product.
 *
 * The filters, the facet counts and the specification table all read
 * product_attribute_values, and none of them should have to learn what a
 * variant is. A piece stocked in green and red answers the colour question
 * with both, which is the honest answer and exactly what a shopper filtering
 * for green is asking.
 */
async function mirrorAxisValues(
  productId: string,
  drafts: VariantDraft[],
  axes: Attribute[],
): Promise<void> {
  const supabase = createAdminSupabase();
  if (!supabase) return;

  /*
    A product with no variants is still described the old way, and its answers
    are its own — not something this function put there.

    Without this, ticking Colour as an axis for Sarees and then saving any
    existing saree would delete the colour it had been given, and the piece
    would quietly drop out of the colour filter. The moment it has even one
    variant the axis values become derived, and clearing a stale one is then
    the right thing to do.
  */
  if (drafts.length === 0) return;

  for (const axis of axes) {
    const values = [
      ...new Set(
        drafts
          .map((d) => d.options[axis.slug]?.trim())
          .filter((v): v is string => Boolean(v)),
      ),
    ];

    if (values.length === 0) {
      await supabase
        .from('product_attribute_values')
        .delete()
        .eq('product_id', productId)
        .eq('attribute_id', axis.id);
      continue;
    }

    await supabase.from('product_attribute_values').upsert({
      product_id: productId,
      attribute_id: axis.id,
      // The array column, because a variant axis is always potentially
      // several answers — that is what makes it an axis.
      value: null,
      values,
    });
  }
}

/** Replaces the photographs and measurements attached to axis values. */
export async function saveOptionDetails(
  productId: string,
  details: OptionDetailDraft[],
  axes: Attribute[],
): Promise<void> {
  const supabase = createAdminSupabase();
  if (!supabase) return;

  const idBySlug = new Map(axes.map((a) => [a.slug, a.id]));

  await supabase.from('product_option_details').delete().eq('product_id', productId);

  const rows = details
    .map((detail) => ({
      product_id: productId,
      attribute_id: idBySlug.get(detail.attributeSlug),
      value: detail.value,
      images: detail.images ?? [],
      measurements: Object.fromEntries(
        Object.entries(detail.measurements ?? {}).filter(([, v]) => String(v).trim()),
      ),
    }))
    .filter(
      (row): row is typeof row & { attribute_id: string } =>
        Boolean(row.attribute_id) &&
        // Nothing to say about this value; the row would only be noise.
        (row.images.length > 0 || Object.keys(row.measurements).length > 0),
    );

  if (rows.length === 0) return;
  const { error } = await supabase.from('product_option_details').insert(rows);
  if (error) throw new Error(error.message);
}

function describeWriteError(error: { code?: string; message: string }): string {
  // The unique index on (product_id, option_key) is the one an admin trips.
  return error.code === '23505'
    ? 'Two rows describe the same combination, or a SKU is already in use.'
    : error.message;
}

// ------------------------------------------------------------- request input

/**
 * Variants submitted with the product, or undefined when the form never
 * carried them. Undefined and [] mean different things: the first is "leave
 * them alone", the second is "the admin removed every one".
 */
export function parseVariantDrafts(body: { variants?: unknown }): VariantDraft[] | undefined {
  if (!Array.isArray(body.variants)) return undefined;

  return (body.variants as Record<string, unknown>[])
    .map((v) => ({
      id: typeof v.id === 'string' && v.id ? v.id : undefined,
      options:
        v.options && typeof v.options === 'object' && !Array.isArray(v.options)
          ? Object.fromEntries(
              Object.entries(v.options as Record<string, unknown>)
                .map(([k, value]) => [k, String(value ?? '').trim()])
                .filter(([, value]) => value),
            )
          : {},
      sku: v.sku ? String(v.sku).trim() : null,
      stock_quantity: Math.max(0, Math.trunc(Number(v.stock_quantity) || 0)),
      price:
        v.price === null || v.price === undefined || v.price === '' || Number.isNaN(Number(v.price))
          ? null
          : Number(v.price),
      images: Array.isArray(v.images) ? (v.images as string[]).map(String) : [],
    }))
    .filter((v) => Object.keys(v.options).length > 0);
}

/** Per-value photographs and measurements submitted with the product. */
export function parseOptionDetails(body: {
  optionDetails?: unknown;
}): OptionDetailDraft[] | undefined {
  if (!Array.isArray(body.optionDetails)) return undefined;

  return (body.optionDetails as Record<string, unknown>[])
    .map((d) => ({
      attributeSlug: String(d.attributeSlug ?? ''),
      value: String(d.value ?? '').trim(),
      images: Array.isArray(d.images) ? (d.images as string[]).map(String) : [],
      measurements:
        d.measurements && typeof d.measurements === 'object' && !Array.isArray(d.measurements)
          ? Object.fromEntries(
              Object.entries(d.measurements as Record<string, unknown>).map(([k, value]) => [
                k,
                String(value ?? ''),
              ]),
            )
          : {},
    }))
    .filter((d) => d.attributeSlug && d.value);
}
