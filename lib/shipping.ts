import { INDIAN_STATES } from '@/lib/states';

/**
 * What it costs to send a parcel, by where it is going.
 *
 * Pure and dependency-free on purpose: the storefront quotes with it in the
 * browser and the server re-prices with it before charging, and the two must
 * agree to the rupee. A customer shown Rs.849 and charged Rs.889 will not
 * come back, so there is exactly one implementation and both sides call it.
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
 * parcel to that one state has been underpriced for a year. The admin screen
 * renders this so an unzoned state is visible rather than merely possible.
 */
export function statesWithoutZone(): string[] {
  return INDIAN_STATES.filter((state) => !ZONE_BY_STATE.has(state));
}

export interface ShippingSettings {
  freeThreshold: number;
  defaultRate: number;
  /** Keyed by zone id. */
  zoneRates: Record<string, number>;
  /** Keyed by state name; wins over the zone. */
  stateRates: Record<string, number>;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  freeThreshold: 5000,
  defaultRate: 150,
  zoneRates: {
    'tamil-nadu': 60,
    south: 110,
    'west-central': 150,
    north: 190,
    east: 190,
    remote: 260,
  },
  stateRates: {},
};

export interface ShippingQuote {
  amount: number;
  /** Why it costs this, for the line under the total. */
  reason: 'free-threshold' | 'state' | 'zone' | 'default' | 'empty';
  zoneId: string | null;
  zoneLabel: string | null;
}

/**
 * Quote the delivery charge for a subtotal going to a state.
 *
 * A state that has not been chosen yet quotes the default rate rather than
 * zero. Showing "free" and then adding a charge once the address is filled in
 * reads as a bait, and it is the estimate the cart page has to show before it
 * can possibly know where the parcel is going.
 */
export function quoteShipping(
  subtotal: number,
  state: string | null | undefined,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): ShippingQuote {
  const zoneId = zoneForState(state);
  const zoneLabel = SHIPPING_ZONES.find((z) => z.id === zoneId)?.label ?? null;

  if (subtotal <= 0) {
    return { amount: 0, reason: 'empty', zoneId, zoneLabel };
  }

  if (settings.freeThreshold > 0 && subtotal >= settings.freeThreshold) {
    return { amount: 0, reason: 'free-threshold', zoneId, zoneLabel };
  }

  const trimmed = state?.trim();
  if (trimmed) {
    const override = settings.stateRates[trimmed];
    if (typeof override === 'number' && Number.isFinite(override)) {
      return { amount: override, reason: 'state', zoneId, zoneLabel };
    }
  }

  if (zoneId) {
    const zoneRate = settings.zoneRates[zoneId];
    if (typeof zoneRate === 'number' && Number.isFinite(zoneRate)) {
      return { amount: zoneRate, reason: 'zone', zoneId, zoneLabel };
    }
  }

  return { amount: settings.defaultRate, reason: 'default', zoneId, zoneLabel };
}

/** The amount alone, for callers that do not need the reasoning. */
export function shippingFor(
  subtotal: number,
  state?: string | null,
  settings?: ShippingSettings,
): number {
  return quoteShipping(subtotal, state, settings).amount;
}
