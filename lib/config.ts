/**
 * Single source of truth for store identity and commerce rules.
 * Anything a shop owner might want to change without touching components.
 */

/**
 * Treat a blank environment variable as absent.
 *
 * `??` only falls back on null/undefined, so a variable that exists but is
 * empty — exactly what you get by pasting .env.example into a host's
 * environment panel, where every value is blank — slips through and becomes
 * an empty string. That took down a Vercel build: `new URL('')` throws
 * ERR_INVALID_URL while Next collects page data.
 *
 * Takes the value rather than the name on purpose: Next inlines literal
 * `process.env.NEXT_PUBLIC_*` references at build time, so a dynamic lookup
 * would break in client bundles.
 */
export function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const STORE = {
  name: 'Sri Laxmi Silks',
  tagline: 'Celebrating Ancient Craftsmanship',
  legalName: 'Sri Laxmi Silks Coimbatore',
  email: envOr(process.env.ADMIN_EMAIL, 'orders@srilaxmisilks.com'),
  phone: '+91 97894 67448',
  gstin: '33ABCDE1234F1Z5',
  address: {
    line1: 'No 42, Murugan Shopping Complex',
    line2: 'Big Bazaar Street, Uppukinar Lane',
    landmark: 'Near Pothys, Town Hall',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
  },
} as const;

export const COMMERCE = {
  /** Orders at or above this subtotal ship free. */
  freeShippingThreshold: 5000,
  shippingFlatRate: 150,
  /** Guard rail so a single line item cannot run away. */
  maxQuantityPerItem: 10,
} as const;

export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= COMMERCE.freeShippingThreshold ? 0 : COMMERCE.shippingFlatRate;
}

export const COURIERS = [
  'Delhivery',
  'Blue Dart',
  'DTDC',
  'India Post',
  'Ekart',
  'Shadowfax',
  'Professional Couriers',
] as const;

export type Courier = (typeof COURIERS)[number];

const COURIER_TRACKING_URLS: Record<string, (id: string) => string> = {
  Delhivery: (id) => `https://www.delhivery.com/track/package/${id}`,
  'Blue Dart': (id) => `https://www.bluedart.com/tracking?trackNumbers=${id}`,
  DTDC: (id) => `https://www.dtdc.in/trace.asp?strCnno=${id}`,
  'India Post': () =>
    'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignments.aspx',
  Ekart: (id) => `https://ekartlogistics.com/shipmenttrack/${id}`,
  Shadowfax: (id) => `https://track.shadowfax.in/?trackingId=${id}`,
  'Professional Couriers': (id) =>
    `https://www.tpcindia.com/Tracking2014.aspx?id=${id}`,
};

export function generateCourierTrackingUrl(courier: string, trackingId: string): string {
  const build = COURIER_TRACKING_URLS[courier];
  return build ? build(encodeURIComponent(trackingId)) : `https://www.google.com/search?q=${encodeURIComponent(`${courier} ${trackingId}`)}`;
}

/**
 * The postal address as separate display lines.
 *
 * One formatter for every surface — footer, contact page, invoice, order
 * email and the structured data — so a shop that moves is a single edit and
 * the address cannot end up written three different ways.
 */
export function storeAddressLines(): string[] {
  const { line1, line2, landmark, city, state, pincode } = STORE.address;
  return [line1, line2, landmark, `${city}, ${state} ${pincode}`].filter(Boolean);
}

/** The same address on one line, for the invoice header and email footer. */
export function storeAddressOneLine(): string {
  return storeAddressLines().join(', ');
}

/**
 * Public "message us" link for the floating button and the contact page.
 *
 * Uses NEXT_PUBLIC_WHATSAPP_NUMBER when set, otherwise falls back to the
 * store's listed phone number. wa.me wants digits only, including the country
 * code and no plus sign.
 *
 * NOTE ON DIRECTION: `text` prefills the *customer's* compose box — it is the
 * opening line they send to you, not a greeting they receive. The auto-reply
 * a customer gets back is configured in the WhatsApp Business app under
 * Business tools → Greeting message, not here.
 */
export const WHATSAPP_PREFILL = `Hello ${STORE.name}, Can I have More Info`;

export function whatsappUrl(message?: string): string {
  const raw = envOr(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, STORE.phone);
  const digits = raw.replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits;
  const text = message ?? WHATSAPP_PREFILL;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/**
 * The site's own absolute base URL, used for invoice links, order emails,
 * the sitemap and `metadataBase`.
 *
 * Deliberately forgiving about what a shop owner types into a host's
 * environment panel: blank falls through to the deploy URL, a bare host like
 * "yourstore.in" gains a scheme, and a trailing slash is trimmed. Anything
 * still unparseable falls back rather than throwing, because this runs during
 * the production build — a bad value here should not take the whole deploy
 * down, and the fallback is always valid.
 */
export function appUrl(path = ''): string {
  const vercel = envOr(process.env.VERCEL_URL, '');
  const fallback = vercel ? `https://${vercel}` : 'http://localhost:3000';

  let base = envOr(process.env.NEXT_PUBLIC_APP_URL, fallback);
  if (!/^https?:\/\//i.test(base)) base = `https://${base.replace(/^\/+/, '')}`;

  try {
    new URL(base);
  } catch {
    base = fallback;
  }

  return `${base.replace(/\/+$/, '')}${path}`;
}
