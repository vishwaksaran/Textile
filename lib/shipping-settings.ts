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

/**
 * The rates, read through the *cacheable* anon client.
 *
 * For copy rather than for charging. The authoritative read below opts out of
 * Next's data cache, which makes any page calling it dynamic — and the home
 * page is statically generated with the banner as its LCP element, so paying
 * a round trip on every visit to print a shipping figure would be a poor
 * trade. This one rides the page's own revalidate window instead.
 */
export async function getPublicShippingSettings(): Promise<ShippingSettings> {
  const supabase = createPublicSupabase();
  if (!supabase) return DEFAULT_SHIPPING_SETTINGS;
  return readSettings(supabase);
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const supabase = createAdminSupabase() ?? createPublicSupabase();
  if (!supabase) return DEFAULT_SHIPPING_SETTINGS;
  return readSettings(supabase);
}

async function readSettings(
  supabase: NonNullable<ReturnType<typeof createPublicSupabase>>,
): Promise<ShippingSettings> {

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
    default_extra_rate?: number | string | null;
    zone_rates?: unknown;
    zone_extra_rates?: unknown;
    state_rates?: unknown;
    state_extra_rates?: unknown;
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
    // Falls back to the first-piece rate, not to zero: on a row written
    // before per-piece pricing existed, charging the same for every piece is
    // the safe reading of "no extra rate set".
    defaultExtraRate:
      row.default_extra_rate === null || row.default_extra_rate === undefined
        ? DEFAULT_SHIPPING_SETTINGS.defaultExtraRate
        : Number(row.default_extra_rate),
    zoneRates: toNumberMap(row.zone_rates),
    zoneExtraRates: toNumberMap(row.zone_extra_rates),
    stateRates: toNumberMap(row.state_rates),
    stateExtraRates: toNumberMap(row.state_extra_rates),
  };
}

export async function updateShippingSettings(patch: {
  freeThreshold?: number;
  defaultRate?: number;
  defaultExtraRate?: number;
  zoneRates?: Record<string, number>;
  zoneExtraRates?: Record<string, number>;
  stateRates?: Record<string, number>;
  stateExtraRates?: Record<string, number>;
}): Promise<ShippingSettings> {
  const supabase = createAdminSupabase();
  if (!supabase) throw new Error('Supabase service role key is not configured.');

  const row: Record<string, unknown> = { id: 1 };
  if (patch.freeThreshold !== undefined) row.free_threshold = patch.freeThreshold;
  if (patch.defaultRate !== undefined) row.default_rate = patch.defaultRate;
  if (patch.defaultExtraRate !== undefined) row.default_extra_rate = patch.defaultExtraRate;
  if (patch.zoneRates !== undefined) row.zone_rates = patch.zoneRates;
  if (patch.zoneExtraRates !== undefined) row.zone_extra_rates = patch.zoneExtraRates;
  if (patch.stateRates !== undefined) row.state_rates = patch.stateRates;
  if (patch.stateExtraRates !== undefined) row.state_extra_rates = patch.stateExtraRates;

  const { error } = await supabase
    .from('shipping_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return getShippingSettings();
}
