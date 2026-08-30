import 'server-only';

import { createAdminSupabase, createPublicSupabase } from '@/lib/supabase/server';
import { DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from '@/lib/shipping';

/**
 * Reads and writes the single row of shipping rates.
 *
 * Reads fall back to the defaults rather than throwing. A checkout that
 * quotes the default rate is recoverable; one that 500s because a settings
 * row is missing loses the sale outright.
 */

function toNumberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return DEFAULT_SHIPPING_SETTINGS;

  const { data, error } = await supabase
    .from('shipping_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[shipping] could not read settings, using defaults', error.message);
    return DEFAULT_SHIPPING_SETTINGS;
  }

  const row = data as {
    free_threshold?: number | string | null;
    default_rate?: number | string | null;
    zone_rates?: unknown;
    state_rates?: unknown;
  };

  return {
    freeThreshold:
      row.free_threshold === null || row.free_threshold === undefined
        ? DEFAULT_SHIPPING_SETTINGS.freeThreshold
        : Number(row.free_threshold),
    defaultRate:
      row.default_rate === null || row.default_rate === undefined
        ? DEFAULT_SHIPPING_SETTINGS.defaultRate
        : Number(row.default_rate),
    zoneRates: toNumberMap(row.zone_rates),
    stateRates: toNumberMap(row.state_rates),
  };
}

export async function updateShippingSettings(patch: {
  freeThreshold?: number;
  defaultRate?: number;
  zoneRates?: Record<string, number>;
  stateRates?: Record<string, number>;
}): Promise<ShippingSettings> {
  const supabase = createAdminSupabase();
  if (!supabase) throw new Error('Supabase service role key is not configured.');

  const row: Record<string, unknown> = { id: 1 };
  if (patch.freeThreshold !== undefined) row.free_threshold = patch.freeThreshold;
  if (patch.defaultRate !== undefined) row.default_rate = patch.defaultRate;
  if (patch.zoneRates !== undefined) row.zone_rates = patch.zoneRates;
  if (patch.stateRates !== undefined) row.state_rates = patch.stateRates;

  const { error } = await supabase
    .from('shipping_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return getShippingSettings();
}
