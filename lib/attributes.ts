import 'server-only';

import { createAdminSupabase, createPublicSupabase } from '@/lib/supabase/server';

export type AttributeInputType =
  | 'dropdown'
  | 'multiselect'
  | 'dropdown_custom'
  | 'text'
  | 'number'
  | 'boolean'
  | 'measurement';

export interface AttributeOption {
  id: string;
  value: string;
  sort_order: number;
  is_active: boolean;
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  input_type: AttributeInputType;
  unit: string | null;
  is_filterable: boolean;
  help_text: string | null;
  sort_order: number;
  options: AttributeOption[];
  /** Set when read for a particular category. */
  is_required?: boolean;
}

export interface AttributeValue {
  attribute_id: string;
  value: string | null;
  values: string[] | null;
}

/**
 * The attributes a category asks for, including those it inherits.
 *
 * Assignments are made against a section, and its subcategories inherit them:
 * Churidars is asked for fabric and sleeve type, so 3 Piece is too, without
 * anyone re-ticking the same list four times. A subcategory can still add its
 * own, and those come last.
 *
 * Returns an empty list rather than throwing when the tables are missing, so
 * a product form still renders — with its fixed fields — on an install where
 * this migration has not been run.
 */
export async function getCategoryAttributes(categoryId: string | null): Promise<Attribute[]> {
  if (!categoryId) return [];
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return [];

  const { data: category } = await supabase
    .from('categories')
    .select('id, parent_id')
    .eq('id', categoryId)
    .maybeSingle();

  if (!category) return [];

  const lineage = [category.id, (category as { parent_id: string | null }).parent_id].filter(
    (id): id is string => Boolean(id),
  );

  const { data, error } = await supabase
    .from('category_attributes')
    .select('attribute_id, is_required, sort_order, attributes (*)')
    .in('category_id', lineage)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  const rows = data as unknown as {
    attribute_id: string;
    is_required: boolean;
    sort_order: number;
    attributes: Omit<Attribute, 'options'> | null;
  }[];

  // A section and its child can both name the same attribute; the child's
  // ordering wins because it is more specific, and the attribute appears once.
  const byId = new Map<string, Attribute>();
  for (const row of rows) {
    if (!row.attributes) continue;
    byId.set(row.attribute_id, {
      ...row.attributes,
      is_required: row.is_required,
      sort_order: row.sort_order,
      options: [],
    });
  }
  if (byId.size === 0) return [];

  const { data: options } = await supabase
    .from('attribute_options')
    .select('*')
    .in('attribute_id', [...byId.keys()])
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  for (const option of (options as AttributeOption[] | null) ?? []) {
    byId.get((option as unknown as { attribute_id: string }).attribute_id)?.options.push(option);
  }

  return [...byId.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
}

/** Every attribute the shop has defined, for the admin's own screens. */
export async function getAllAttributes(): Promise<Attribute[]> {
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('attributes')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return [];

  const attrs = (data as Omit<Attribute, 'options'>[]).map((a) => ({ ...a, options: [] }));
  if (attrs.length === 0) return [];

  const { data: options } = await supabase
    .from('attribute_options')
    .select('*')
    .order('sort_order', { ascending: true });

  const byId = new Map(attrs.map((a) => [a.id, a as Attribute]));
  for (const option of (options as AttributeOption[] | null) ?? []) {
    byId.get((option as unknown as { attribute_id: string }).attribute_id)?.options.push(option);
  }
  return [...byId.values()];
}

/** What one product has answered, keyed by attribute id. */
export async function getProductAttributeValues(
  productId: string,
): Promise<Record<string, AttributeValue>> {
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('product_attribute_values')
    .select('attribute_id, value, values')
    .eq('product_id', productId);

  if (error || !data) return {};
  return Object.fromEntries(
    (data as AttributeValue[]).map((row) => [row.attribute_id, row]),
  );
}

/**
 * Replaces a product's answers.
 *
 * Deletes what is no longer set rather than leaving it behind: an attribute
 * cleared in the form has to disappear from the spec table, and an upsert
 * alone would leave the old answer sitting there looking current.
 */
export async function saveProductAttributeValues(
  productId: string,
  values: Record<string, { value?: string | null; values?: string[] | null }>,
): Promise<void> {
  const supabase = createAdminSupabase();
  if (!supabase) return;

  const rows = Object.entries(values)
    .map(([attribute_id, v]) => ({
      product_id: productId,
      attribute_id,
      value: v.value?.trim() ? v.value.trim() : null,
      values: v.values?.length ? v.values : null,
    }))
    .filter((r) => r.value !== null || r.values !== null);

  const keep = rows.map((r) => r.attribute_id);

  let remove = supabase.from('product_attribute_values').delete().eq('product_id', productId);
  if (keep.length > 0) remove = remove.not('attribute_id', 'in', `(${keep.join(',')})`);
  await remove;

  if (rows.length > 0) {
    await supabase
      .from('product_attribute_values')
      .upsert(rows, { onConflict: 'product_id,attribute_id' });
  }
}
