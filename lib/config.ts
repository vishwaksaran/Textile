/**
 * Single source of truth for store identity and commerce rules.
 * Anything a shop owner might want to change without touching components.
 */
export const STORE = {
  name: 'Sri Laxmi Silks',
  tagline: 'Celebrating Ancient Craftsmanship',
  legalName: 'Sri Laxmi Silks Coimbatore',
  email: process.env.ADMIN_EMAIL ?? 'orders@srilaxmisilks.in',
  phone: '+91 97894 67448',
  gstin: '33ABCDE1234F1Z5',
  address: {
    line1: '123 Cross Cut Road',
    line2: 'Gandhipuram',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641012',
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
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? STORE.phone;
  const digits = raw.replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits;
  const text = message ?? WHATSAPP_PREFILL;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function appUrl(path = ''): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return `${base.replace(/\/$/, '')}${path}`;
}
