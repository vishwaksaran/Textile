import 'server-only';

import { createAdminSupabase, createPublicSupabase } from '@/lib/supabase/server';
import { computeTax, DEFAULT_TAX_SETTINGS, type TaxSettings, type TaxSummary } from '@/lib/tax';
import { STORE } from '@/lib/config';
import type { Order, TaxSettingsRow } from '@/types';

/**
 * Reads and writes the single row of shop-wide tax settings.
 *
 * Every read falls back to DEFAULT_TAX_SETTINGS rather than throwing. An
 * invoice that renders with the default rate is recoverable; one that 500s
 * because the settings row is missing leaves a paying customer with no
 * receipt. The admin screen makes the live values obvious either way.
 */

function fromRow(row: Partial<TaxSettingsRow> | null | undefined): TaxSettings {
  if (!row) return DEFAULT_TAX_SETTINGS;
  return {
    gstRate:
      row.gst_rate === null || row.gst_rate === undefined
        ? DEFAULT_TAX_SETTINGS.gstRate
        : Number(row.gst_rate),
    defaultHsn: row.default_hsn ?? null,
    pricesIncludeTax: row.prices_include_tax ?? DEFAULT_TAX_SETTINGS.pricesIncludeTax,
    showTaxBreakdown: row.show_tax_breakdown ?? DEFAULT_TAX_SETTINGS.showTaxBreakdown,
  };
}

export async function getTaxSettings(): Promise<TaxSettings> {
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return DEFAULT_TAX_SETTINGS;

  const { data, error } = await supabase
    .from('tax_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[tax] could not read settings, using defaults', error.message);
    return DEFAULT_TAX_SETTINGS;
  }
  return fromRow(data as TaxSettingsRow | null);
}

export async function updateTaxSettings(patch: {
  gstRate?: number;
  defaultHsn?: string | null;
  pricesIncludeTax?: boolean;
  showTaxBreakdown?: boolean;
}): Promise<TaxSettings> {
  const supabase = createAdminSupabase();
  if (!supabase) throw new Error('Supabase service role key is not configured.');

  const row: Record<string, unknown> = { id: 1 };
  if (patch.gstRate !== undefined) row.gst_rate = patch.gstRate;
  if (patch.defaultHsn !== undefined) row.default_hsn = patch.defaultHsn || null;
  if (patch.pricesIncludeTax !== undefined) row.prices_include_tax = patch.pricesIncludeTax;
  if (patch.showTaxBreakdown !== undefined) row.show_tax_breakdown = patch.showTaxBreakdown;

  const { data, error } = await supabase
    .from('tax_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as TaxSettingsRow);
}

/**
 * Build the tax breakdown for a stored order.
 *
 * Prefers the per-line snapshot (`hsn_at_time`, `gst_rate_at_time`) so a
 * reprinted invoice shows the rate that applied on the day of the sale, and
 * only falls back to the product's current values for orders placed before
 * those columns existed.
 *
 * Returns null when the breakdown is switched off, which makes the caller
 * render the plain receipt layout instead.
 */
export async function taxForOrder(order: Order): Promise<TaxSummary | null> {
  const settings = await getTaxSettings();
  if (!settings.showTaxBreakdown) return null;

  const items = order.order_items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price_at_time) * item.quantity,
    0,
  );
  const shipping = Math.max(Number(order.total_amount ?? subtotal) - subtotal, 0);

  return computeTax({
    items: items.map((item) => ({
      description: item.products?.name ?? 'Handloom piece',
      quantity: item.quantity,
      gross: Number(item.price_at_time) * item.quantity,
      hsn: item.hsn_at_time ?? item.products?.hsn_code ?? null,
      rate:
        item.gst_rate_at_time !== null && item.gst_rate_at_time !== undefined
          ? Number(item.gst_rate_at_time)
          : item.products?.gst_rate !== null && item.products?.gst_rate !== undefined
            ? Number(item.products.gst_rate)
            : null,
    })),
    shipping,
    buyerState: order.customer_state,
    sellerGstin: STORE.gstin,
    settings,
    intraStateOverride: order.is_intra_state,
  });
}
