import { INDIAN_STATES } from '@/lib/states';

/**
 * What it costs to send a parcel, by where it is going and how many pieces.
 *
 * Pure and dependency-free on purpose: the storefront quotes with it in the
 * browser and the server re-prices with it before charging, and the two must
 * agree to the rupee. A customer shown Rs.849 and charged Rs.889 will not
 * come back, so there is exactly one implementation and both sides call it.
 *
 * Charging is per piece, in two parts: a rate for the first saree and a rate
 * for each one after it. Both are set per zone, so a shop that ships several
 * pieces in one parcel can price the extras lower without giving away the
 * first, and a shop that cannot can simply set the two the same.
 */

export interface ShippingZone {
  id: string;
  label: string;
  states: string[];
}

/**
 * Zones exist so "all of north India" is one number to maintain rather than
 * eleven. Grouped by what a courier actually charges to reach them from
 * Coimbatore, which is roughly distance banded by trunk route — not by the
 * administrative regions, where Rajasthan and Delhi would sit together
 * despite very different freight.
 */
export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'tamil-nadu',
    label: 'Tamil Nadu',
    states: ['Tamil Nadu'],
  },
  {
    id: 'south',
    label: 'South India',
    states: ['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry'],
  },
  {
    id: 'west-central',
    label: 'West & Central India',
    states: [
      'Maharashtra',
      'Goa',
      'Gujarat',
      'Madhya Pradesh',
      'Chhattisgarh',
      'Rajasthan',
      'Dadra and Nagar Haveli and Daman and Diu',
    ],
  },
  {
    id: 'north',
    label: 'North India',
    states: [
      'Delhi',
      'Haryana',
      'Punjab',
      'Uttar Pradesh',
      'Uttarakhand',
      'Himachal Pradesh',
      'Jammu and Kashmir',
      'Chandigarh',
      'Bihar',
      'Jharkhand',
    ],
  },
  {
    id: 'east',
    label: 'East India',
    states: ['West Bengal', 'Odisha'],
  },
  {
    id: 'remote',
    label: 'North-east, hills & islands',
    states: [
      'Assam',
      'Arunachal Pradesh',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Sikkim',
      'Tripura',
      'Ladakh',
      'Andaman and Nicobar Islands',
      'Lakshadweep',
    ],
  },
];

/** Reverse index, built once: state name to zone id. */
const ZONE_BY_STATE = new Map<string, string>(
  SHIPPING_ZONES.flatMap((zone) => zone.states.map((state) => [state, zone.id] as const)),
);

export function zoneForState(state: string | null | undefined): string | null {
  if (!state) return null;
  return ZONE_BY_STATE.get(state.trim()) ?? null;
}

/**
 * Every state, checked against the zone map.
 *
 * A state in `INDIAN_STATES` that no zone claims would silently fall through
 * to the default rate, which is the sort of thing nobody notices until a
 * parcel to that one state has been underpriced for a year.
 */
export function statesWithoutZone(): string[] {
  return INDIAN_STATES.filter((state) => !ZONE_BY_STATE.has(state));
}

export interface ShippingSettings {
  freeThreshold: number;
  /** Fallback for the first piece when nothing more specific matches. */
  defaultRate: number;
  /** Fallback for each piece after the first. */
  defaultExtraRate: number;
  /** First-piece rate, keyed by zone id. */
  zoneRates: Record<string, number>;
  /** Rate for each additional piece, keyed by zone id. */
  zoneExtraRates: Record<string, number>;
  /** First-piece rate for one state; wins over its zone. */
  stateRates: Record<string, number>;
  /** Additional-piece rate for one state; wins over its zone. */
  stateExtraRates: Record<string, number>;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  freeThreshold: 5000,
  defaultRate: 80,
  defaultExtraRate: 80,
  zoneRates: {
    'tamil-nadu': 60,
    south: 80,
    'west-central': 80,
    north: 80,
    east: 80,
    remote: 80,
  },
  // Tamil Nadu is the only zone where a second piece costs less to send —
  // everywhere else the courier charges per piece, so the rates match.
  zoneExtraRates: {
    'tamil-nadu': 30,
    south: 80,
    'west-central': 80,
    north: 80,
    east: 80,
    remote: 80,
  },
  stateRates: {},
  stateExtraRates: {},
};

export interface ShippingQuote {
  amount: number;
  /** Why it costs this, for the line under the total. */
  reason: 'free-threshold' | 'state' | 'zone' | 'default' | 'empty';
  zoneId: string | null;
  zoneLabel: string | null;
  /** The two parts, so the breakdown can be shown rather than asserted. */
  firstRate: number;
  extraRate: number;
  quantity: number;
}

/**
 * Quote the delivery charge for a subtotal and piece count going to a state.
 *
 * A state that has not been chosen yet quotes the default rather than zero.
 * Showing "free" and then adding a charge once the address is filled in reads
 * as a bait.
 */
export function quoteShipping(
  subtotal: number,
  state: string | null | undefined,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
  quantity = 1,
): ShippingQuote {
  const zoneId = zoneForState(state);
  const zoneLabel = SHIPPING_ZONES.find((z) => z.id === zoneId)?.label ?? null;
  const pieces = Math.max(Math.floor(quantity) || 0, 0);

  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  const trimmed = state?.trim();
  // state override → zone → default, resolved for each part independently so
  // a state can raise its first-piece rate without losing the zone's extras.
  const firstRate =
    (trimmed ? num(settings.stateRates[trimmed]) : null) ??
    (zoneId ? num(settings.zoneRates[zoneId]) : null) ??
    settings.defaultRate;
  const extraRate =
    (trimmed ? num(settings.stateExtraRates[trimmed]) : null) ??
    (zoneId ? num(settings.zoneExtraRates[zoneId]) : null) ??
    settings.defaultExtraRate;

  const reason: ShippingQuote['reason'] =
    trimmed && num(settings.stateRates[trimmed]) !== null
      ? 'state'
      : zoneId && num(settings.zoneRates[zoneId]) !== null
        ? 'zone'
        : 'default';

  const base = { zoneId, zoneLabel, firstRate, extraRate, quantity: pieces };

  if (subtotal <= 0 || pieces === 0) {
    return { ...base, amount: 0, reason: 'empty' };
  }
  if (settings.freeThreshold > 0 && subtotal >= settings.freeThreshold) {
    return { ...base, amount: 0, reason: 'free-threshold' };
  }

  return { ...base, amount: firstRate + extraRate * (pieces - 1), reason };
}

/** The amount alone, for callers that do not need the reasoning. */
export function shippingFor(
  subtotal: number,
  state?: string | null,
  settings?: ShippingSettings,
  quantity = 1,
): number {
  return quoteShipping(subtotal, state, settings, quantity).amount;
}
