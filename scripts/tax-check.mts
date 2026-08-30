/**
 * Proves the GST arithmetic reconciles, before it ever reaches an invoice.
 *
 *   npm run tax:check
 *
 * The property that matters: taxable + tax must equal the gross the customer
 * actually paid, for every rate and every amount. An invoice whose parts do
 * not sum to the charged total is a compliance problem and a support call.
 */
import { computeTax, stateCodeFor, stateCodeFromGstin } from '../lib/tax';
import { STORE } from '../lib/config';

const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ${GREEN('ok')}   ${name}${detail ? DIM(`  ${detail}`) : ''}`);
  } else {
    failed += 1;
    console.log(`  ${RED('FAIL')} ${name}${detail ? `  ${detail}` : ''}`);
  }
}

const GSTIN = STORE.gstin;

console.log(`\n  seller GSTIN ${GSTIN} -> state code ${stateCodeFromGstin(GSTIN)}\n`);

// ---------------------------------------------------------------- state codes
check('GSTIN yields Tamil Nadu', stateCodeFromGstin(GSTIN) === '33');
check('"Tamil Nadu" resolves', stateCodeFor('Tamil Nadu') === '33');
check('"tamilnadu" resolves', stateCodeFor('tamilnadu') === '33');
check('"TN" resolves', stateCodeFor('TN') === '33');
check('"Karnataka" resolves', stateCodeFor('Karnataka') === '29');
check('blank state is unresolved', stateCodeFor('') === null);
check('nonsense state is unresolved', stateCodeFor('Atlantis') === null);

// ------------------------------------------------------- a real intra-state sale
console.log('\n  Rs.52,000 saree, 5% inclusive, buyer in Tamil Nadu:');
const intra = computeTax({
  items: [{ description: 'Kanchipuram silk saree', quantity: 1, gross: 52000, hsn: '5007' }],
  buyerState: 'Tamil Nadu',
  sellerGstin: GSTIN,
});
console.log(
  DIM(
    `    taxable ${intra.totals.taxable}  cgst ${intra.totals.cgst}  ` +
      `sgst ${intra.totals.sgst}  igst ${intra.totals.igst}  gross ${intra.totals.gross}`,
  ),
);
check('is intra-state', intra.intraState);
check('gross unchanged', intra.totals.gross === 52000);
check(
  'taxable + tax === gross',
  Math.round((intra.totals.taxable + intra.totals.tax) * 100) === 5200000,
);
check('cgst + sgst === tax', Math.round((intra.totals.cgst + intra.totals.sgst) * 100) === Math.round(intra.totals.tax * 100));
check('no igst on intra-state', intra.totals.igst === 0);

// ------------------------------------------------------- a real inter-state sale
console.log('\n  same saree, buyer in Karnataka:');
const inter = computeTax({
  items: [{ description: 'Kanchipuram silk saree', quantity: 1, gross: 52000, hsn: '5007' }],
  buyerState: 'Karnataka',
  sellerGstin: GSTIN,
});
console.log(
  DIM(
    `    taxable ${inter.totals.taxable}  cgst ${inter.totals.cgst}  ` +
      `sgst ${inter.totals.sgst}  igst ${inter.totals.igst}  gross ${inter.totals.gross}`,
  ),
);
check('is inter-state', !inter.intraState);
check('igst carries the whole tax', Math.round(inter.totals.igst * 100) === Math.round(inter.totals.tax * 100));
check('no cgst/sgst on inter-state', inter.totals.cgst === 0 && inter.totals.sgst === 0);
check('same total tax either way', Math.round(inter.totals.tax * 100) === Math.round(intra.totals.tax * 100));

// ------------------------------------------------------------ unknown state
const unknown = computeTax({
  items: [{ description: 'Saree', quantity: 1, gross: 1000 }],
  buyerState: 'Atlantis',
  sellerGstin: GSTIN,
});
check('unresolved state falls back to IGST', !unknown.intraState && unknown.totals.igst > 0);

// --------------------------------------------------------- snapshot override
const forced = computeTax({
  items: [{ description: 'Saree', quantity: 1, gross: 1000 }],
  buyerState: 'Karnataka',
  sellerGstin: GSTIN,
  intraStateOverride: true,
});
check('stored snapshot overrides the state lookup', forced.intraState && forced.totals.cgst > 0);

// ------------------------------------------------------------------ shipping
const shipped = computeTax({
  items: [{ description: 'Cotton saree', quantity: 1, gross: 1200, rate: 5 }],
  shipping: 150,
  buyerState: 'Tamil Nadu',
  sellerGstin: GSTIN,
});
check('shipping becomes its own line', shipped.lines.length === 2);
check('shipping is taxed', shipped.lines[1].cgst > 0);
check(
  'shipping does not change the gross',
  Math.round(shipped.totals.gross * 100) === 135000,
);

// ------------------------------------------------------------- mixed rates
const mixed = computeTax({
  items: [
    { description: 'Silk saree', quantity: 1, gross: 20000, rate: 5, hsn: '5007' },
    { description: 'Stitched blouse', quantity: 2, gross: 3000, rate: 12, hsn: '6206' },
  ],
  buyerState: 'Tamil Nadu',
  sellerGstin: GSTIN,
});
check('two rate buckets', mixed.byRate.length === 2, `rates ${mixed.byRate.map((b) => b.rate).join(', ')}`);
check(
  'mixed-rate total still reconciles',
  Math.round((mixed.totals.taxable + mixed.totals.tax) * 100) === Math.round(mixed.totals.gross * 100),
);

// ------------------------------------------------------------- zero-rated
const zero = computeTax({
  items: [{ description: 'Exempt item', quantity: 1, gross: 500, rate: 0 }],
  buyerState: 'Tamil Nadu',
  sellerGstin: GSTIN,
});
check('zero rate charges no tax', zero.totals.tax === 0 && zero.totals.taxable === 500);

// -------------------------------------------------------- tax-exclusive mode
const exclusive = computeTax({
  items: [{ description: 'Saree', quantity: 1, gross: 1000, rate: 5 }],
  buyerState: 'Tamil Nadu',
  sellerGstin: GSTIN,
  settings: { gstRate: 5, defaultHsn: null, pricesIncludeTax: false, showTaxBreakdown: true },
});
check('exclusive mode adds tax on top', exclusive.totals.taxable === 1000 && exclusive.totals.tax === 50);

// ------------------------------------------------------------------- fuzz
console.log('\n  fuzzing 20,000 random orders:');
let worstDrift = 0;
for (let i = 0; i < 20000; i += 1) {
  const rate = [0, 3, 5, 12, 18, 28][Math.floor(Math.random() * 6)];
  const lineCount = 1 + Math.floor(Math.random() * 4);
  const items = Array.from({ length: lineCount }, (_, n) => ({
    description: `Item ${n}`,
    quantity: 1 + Math.floor(Math.random() * 3),
    gross: Math.round(Math.random() * 9999999) / 100,
    rate,
  }));
  const shipping = Math.random() < 0.3 ? 150 : 0;
  const summary = computeTax({
    items,
    shipping,
    buyerState: Math.random() < 0.5 ? 'Tamil Nadu' : 'Kerala',
    sellerGstin: GSTIN,
  });

  const expectedGross = Math.round((items.reduce((s, it) => s + it.gross, 0) + shipping) * 100);
  const parts = Math.round((summary.totals.taxable + summary.totals.tax) * 100);
  const gross = Math.round(summary.totals.gross * 100);
  const splitOk =
    Math.round((summary.totals.cgst + summary.totals.sgst + summary.totals.igst) * 100) ===
    Math.round(summary.totals.tax * 100);

  worstDrift = Math.max(worstDrift, Math.abs(parts - gross), Math.abs(gross - expectedGross));
  if (parts !== gross || gross !== expectedGross || !splitOk) {
    console.log(RED(`  FAIL at iteration ${i}: parts ${parts} gross ${gross} expected ${expectedGross}`));
    failed += 1;
    break;
  }
}
check('every fuzzed order reconciles to the paisa', worstDrift === 0, `worst drift ${worstDrift} paise`);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
