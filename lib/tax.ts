/**
 * GST calculation for tax invoices.
 *
 * Two rules drive everything here:
 *
 * 1. INDIAN RETAIL PRICES ARE TAX-INCLUSIVE. The listed price is the MRP —
 *    the customer pays that figure and nothing more, and Razorpay captured
 *    exactly it. So tax is *extracted* from the price, never added to it. Add
 *    5% on top of a Rs.52,000 saree and the invoice claims Rs.54,600 against
 *    a Rs.52,000 charge, which is both wrong and unexplainable to a customer.
 *    `pricesIncludeTax` can be switched off in the admin screen if the shop
 *    ever quotes pre-tax prices, but the default is inclusive.
 *
 * 2. PLACE OF SUPPLY DECIDES THE SPLIT. A buyer in the seller's own state
 *    pays CGST + SGST (half the rate each); a buyer anywhere else pays IGST
 *    (the full rate). The seller's state comes from the first two digits of
 *    the GSTIN, so there is no second place to keep it in sync.
 *
 * All arithmetic runs in integer paise. Rupee floats cannot represent a third
 * of a paisa, and an invoice whose parts do not add up to its total is worse
 * than useless. Working in paise and deriving each remainder by subtraction
 * makes the reconciliation exact by construction rather than by luck.
 */

/** GST state codes, as used in the first two digits of a GSTIN. */
export const GST_STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  punjab: '03',
  chandigarh: '04',
  uttarakhand: '05',
  haryana: '06',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  bihar: '10',
  sikkim: '11',
  'arunachal pradesh': '12',
  nagaland: '13',
  manipur: '14',
  mizoram: '15',
  tripura: '16',
  meghalaya: '17',
  assam: '18',
  'west bengal': '19',
  jharkhand: '20',
  odisha: '21',
  chhattisgarh: '22',
  'madhya pradesh': '23',
  gujarat: '24',
  'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27',
  karnataka: '29',
  goa: '30',
  lakshadweep: '31',
  kerala: '32',
  'tamil nadu': '33',
  puducherry: '34',
  'andaman and nicobar islands': '35',
  telangana: '36',
  'andhra pradesh': '37',
  ladakh: '38',
};

/** Spellings customers actually type, mapped to the canonical name. */
const STATE_ALIASES: Record<string, string> = {
  tn: 'tamil nadu',
  tamilnadu: 'tamil nadu',
  pondicherry: 'puducherry',
  orissa: 'odisha',
  'jammu kashmir': 'jammu and kashmir',
  'new delhi': 'delhi',
  ncr: 'delhi',
  'delhi ncr': 'delhi',
  ap: 'andhra pradesh',
  up: 'uttar pradesh',
  mp: 'madhya pradesh',
  wb: 'west bengal',
  hp: 'himachal pradesh',
  'andaman and nicobar': 'andaman and nicobar islands',
  'daman and diu': 'dadra and nagar haveli and daman and diu',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
};

/** Lower-case, strip punctuation, expand ampersands — so "Tamil Nadu." matches. */
function normaliseStateName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return STATE_ALIASES[cleaned] ?? cleaned;
}

/** The GST state code for a free-text state name, or null if unrecognised. */
export function stateCodeFor(state: string | null | undefined): string | null {
  if (!state || !state.trim()) return null;
  return GST_STATE_CODES[normaliseStateName(state)] ?? null;
}

/** The seller's own state code, read from the first two digits of the GSTIN. */
export function stateCodeFromGstin(gstin: string): string | null {
  const code = gstin.trim().slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

export type TaxSettings = {
  gstRate: number;
  defaultHsn: string | null;
  pricesIncludeTax: boolean;
  showTaxBreakdown: boolean;
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  gstRate: 5,
  defaultHsn: null,
  pricesIncludeTax: true,
  showTaxBreakdown: true,
};

export type TaxLine = {
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  /** What the customer pays for this line, tax included. */
  gross: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type RateSummary = {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type TaxSummary = {
  intraState: boolean;
  placeOfSupply: string;
  sellerStateCode: string | null;
  buyerStateCode: string | null;
  lines: TaxLine[];
  /** One row per distinct GST rate — what the HSN summary table prints. */
  byRate: RateSummary[];
  totals: {
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
    gross: number;
  };
};

const toPaise = (rupees: number) => Math.round(rupees * 100);
const toRupees = (paise: number) => paise / 100;

/**
 * Split one gross amount into taxable value and tax, in paise.
 *
 * The tax is always derived by subtraction so that taxable + tax === gross
 * exactly, whatever the rate rounds to.
 */
function splitPaise(
  grossPaise: number,
  rate: number,
  inclusive: boolean,
): { taxablePaise: number; taxPaise: number } {
  if (rate <= 0) return { taxablePaise: grossPaise, taxPaise: 0 };

  if (inclusive) {
    const taxablePaise = Math.round(grossPaise / (1 + rate / 100));
    return { taxablePaise, taxPaise: grossPaise - taxablePaise };
  }
  return { taxablePaise: grossPaise, taxPaise: Math.round((grossPaise * rate) / 100) };
}

export type TaxableItem = {
  description: string;
  quantity: number;
  /** Line total the customer pays, tax included when prices are inclusive. */
  gross: number;
  hsn?: string | null;
  rate?: number | null;
};

/**
 * Build the full tax breakdown for one order.
 *
 * `shipping` is treated as a composite supply and carries the rate of the
 * highest-value line, which is the principal supply. Most orders here ship
 * free anyway, since anything over Rs.5,000 crosses the threshold.
 */
export function computeTax({
  items,
  shipping = 0,
  buyerState,
  sellerGstin,
  settings = DEFAULT_TAX_SETTINGS,
  intraStateOverride,
}: {
  items: TaxableItem[];
  shipping?: number;
  buyerState: string | null | undefined;
  sellerGstin: string;
  settings?: TaxSettings;
  intraStateOverride?: boolean | null;
}): TaxSummary {
  const sellerStateCode = stateCodeFromGstin(sellerGstin);
  const buyerStateCode = stateCodeFor(buyerState);

  // A buyer state we cannot resolve is, by this rule, not the seller's state,
  // so it attracts IGST. Charging IGST where CGST+SGST was due is correctable;
  // wrongly splitting state tax to a state that saw no supply is messier.
  // `intraStateOverride` lets a stored snapshot win, so reprinting an old
  // invoice cannot be rewritten by a later change of registration.
  const intraState =
    intraStateOverride ?? (sellerStateCode !== null && buyerStateCode === sellerStateCode);

  const priced: TaxableItem[] = [...items];
  if (shipping > 0) {
    const principal = items.reduce<TaxableItem | null>(
      (best, item) => (best === null || item.gross > best.gross ? item : best),
      null,
    );
    priced.push({
      description: 'Shipping & handling',
      quantity: 1,
      gross: shipping,
      hsn: '996812',
      rate: principal?.rate ?? settings.gstRate,
    });
  }

  const lines: TaxLine[] = [];
  const totals = { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, grossPaise: 0 };
  const rateBuckets = new Map<
    number,
    { taxable: number; cgst: number; sgst: number; igst: number }
  >();

  for (const item of priced) {
    const rate = item.rate ?? settings.gstRate;
    const grossPaise = toPaise(item.gross);
    const { taxablePaise, taxPaise } = splitPaise(grossPaise, rate, settings.pricesIncludeTax);

    // Halving can leave a stray paisa; give it to SGST by subtraction so the
    // two halves always add back to the whole.
    const cgstPaise = intraState ? Math.round(taxPaise / 2) : 0;
    const sgstPaise = intraState ? taxPaise - cgstPaise : 0;
    const igstPaise = intraState ? 0 : taxPaise;

    lines.push({
      description: item.description,
      hsn: item.hsn ?? settings.defaultHsn ?? '',
      quantity: item.quantity,
      rate,
      gross: toRupees(grossPaise),
      taxable: toRupees(taxablePaise),
      cgst: toRupees(cgstPaise),
      sgst: toRupees(sgstPaise),
      igst: toRupees(igstPaise),
    });

    totals.taxablePaise += taxablePaise;
    totals.cgstPaise += cgstPaise;
    totals.sgstPaise += sgstPaise;
    totals.igstPaise += igstPaise;
    totals.grossPaise += grossPaise;

    const bucket = rateBuckets.get(rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    bucket.taxable += taxablePaise;
    bucket.cgst += cgstPaise;
    bucket.sgst += sgstPaise;
    bucket.igst += igstPaise;
    rateBuckets.set(rate, bucket);
  }

  return {
    intraState,
    placeOfSupply: buyerState && buyerState.trim() ? buyerState.trim() : 'Unknown',
    sellerStateCode,
    buyerStateCode,
    lines,
    byRate: [...rateBuckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rate, b]) => ({
        rate,
        taxable: toRupees(b.taxable),
        cgst: toRupees(b.cgst),
        sgst: toRupees(b.sgst),
        igst: toRupees(b.igst),
      })),
    totals: {
      taxable: toRupees(totals.taxablePaise),
      cgst: toRupees(totals.cgstPaise),
      sgst: toRupees(totals.sgstPaise),
      igst: toRupees(totals.igstPaise),
      tax: toRupees(totals.cgstPaise + totals.sgstPaise + totals.igstPaise),
      gross: toRupees(totals.grossPaise),
    },
  };
}
