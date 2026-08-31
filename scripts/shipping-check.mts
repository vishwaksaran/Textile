/**
 * Checks the delivery quote against every state.
 *
 *   npm run shipping:check
 *
 * The storefront quotes in the browser and the server re-prices before
 * charging, and both call quoteShipping. This proves that function behaves
 * for all 36 states and union territories — that none falls through to the
 * default by accident, and that the free-shipping threshold wins everywhere.
 */
import {
  DEFAULT_SHIPPING_SETTINGS,
  SHIPPING_ZONES,
  quoteShipping,
  statesWithoutZone,
  zoneForState,
} from '../lib/shipping';
import { INDIAN_STATES } from '../lib/states';
import { CITIES_BY_STATE } from '../lib/cities';

const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? GREEN('ok  ') : RED('FAIL')} ${name}${detail ? DIM(`  ${detail}`) : ''}`);
};

console.log('\n  Zones cover every state?');
const orphans = statesWithoutZone();
check('no state is left unzoned', orphans.length === 0, orphans.join(', ') || 'all 36 covered');

const claimed = SHIPPING_ZONES.flatMap((z) => z.states);
const unknown = claimed.filter((s) => !(INDIAN_STATES as readonly string[]).includes(s));
check('no zone names a state that does not exist', unknown.length === 0, unknown.join(', '));
check('no state appears in two zones', new Set(claimed).size === claimed.length);

console.log('\n  Every state quotes a rate:');
for (const zone of SHIPPING_ZONES) {
  const rate = quoteShipping(2000, zone.states[0], DEFAULT_SHIPPING_SETTINGS);
  console.log(
    `    ${zone.label.padEnd(28)} Rs.${String(rate.amount).padStart(4)}  ${DIM(zone.states.length + ' state(s)')}`,
  );
}

let allQuoted = true;
for (const state of INDIAN_STATES) {
  const q = quoteShipping(2000, state, DEFAULT_SHIPPING_SETTINGS);
  if (q.reason === 'default') allQuoted = false;
}
check('none falls back to the default rate', allQuoted);

console.log('\n  Rules:');
check(
  'free above the threshold, even to the far zones',
  quoteShipping(6000, 'Assam', DEFAULT_SHIPPING_SETTINGS).amount === 0,
);
check(
  'charged below the threshold',
  quoteShipping(4999, 'Tamil Nadu', DEFAULT_SHIPPING_SETTINGS).amount > 0,
);
check('an empty cart is never charged', quoteShipping(0, 'Tamil Nadu').amount === 0);
check(
  'a state override beats its zone',
  quoteShipping(2000, 'Kerala', {
    ...DEFAULT_SHIPPING_SETTINGS,
    stateRates: { Kerala: 42 },
  }).amount === 42,
);
check(
  'an unknown state still quotes something',
  quoteShipping(2000, 'Atlantis', DEFAULT_SHIPPING_SETTINGS).amount ===
    DEFAULT_SHIPPING_SETTINGS.defaultRate,
);
check(
  'no state chosen yet quotes the default, not free',
  quoteShipping(2000, null, DEFAULT_SHIPPING_SETTINGS).amount > 0,
);
check('Tamil Nadu is the cheapest zone', (() => {
  const tn = quoteShipping(2000, 'Tamil Nadu', DEFAULT_SHIPPING_SETTINGS).amount;
  return SHIPPING_ZONES.every((z) => quoteShipping(2000, z.states[0], DEFAULT_SHIPPING_SETTINGS).amount >= tn);
})());

console.log('\n  Per-piece charging:');
const tnRate = (n: number) => quoteShipping(2000, 'Tamil Nadu', DEFAULT_SHIPPING_SETTINGS, n).amount;
const otherRate = (n: number) => quoteShipping(2000, 'Karnataka', DEFAULT_SHIPPING_SETTINGS, n).amount;
console.log(`    Tamil Nadu    1:${tnRate(1)}  2:${tnRate(2)}  3:${tnRate(3)}  4:${tnRate(4)}`);
console.log(`    Other states  1:${otherRate(1)}  2:${otherRate(2)}  3:${otherRate(3)}  4:${otherRate(4)}`);
check('TN taper: 60, 90, 120, 150', tnRate(1) === 60 && tnRate(2) === 90 && tnRate(3) === 120 && tnRate(4) === 150);
check('Other flat: 80, 160, 240, 320', otherRate(1) === 80 && otherRate(2) === 160 && otherRate(3) === 240 && otherRate(4) === 320);
check('free threshold still wins on a multi-piece order', quoteShipping(6000, 'Assam', DEFAULT_SHIPPING_SETTINGS, 5).amount === 0);
check('zero pieces is never charged', quoteShipping(2000, 'Tamil Nadu', DEFAULT_SHIPPING_SETTINGS, 0).amount === 0);

console.log('\n  City suggestions:');
const missingCities = INDIAN_STATES.filter((s) => !CITIES_BY_STATE[s]?.length);
check('every state offers city suggestions', missingCities.length === 0, missingCities.join(', '));
const strayStates = Object.keys(CITIES_BY_STATE).filter(
  (s) => !(INDIAN_STATES as readonly string[]).includes(s),
);
check('no city list for a state that does not exist', strayStates.length === 0, strayStates.join(', '));

console.log(`\n  ${failed === 0 ? GREEN('all checks passed') : RED(`${failed} failed`)}\n`);
process.exit(failed === 0 ? 0 : 1);
