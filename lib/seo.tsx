import { STORE, appUrl, storeMapsUrl, storeProfileUrls } from '@/lib/config';
import { shippingFor, type ShippingSettings } from '@/lib/shipping';
import { INDIAN_STATES } from '@/lib/states';
import { effectivePrice } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Shared SEO helpers.
 *
 * Nothing here invents facts. Structured data that misrepresents a business —
 * opening hours nobody checked, coordinates for the wrong building, ratings
 * that do not exist — is worse than omitting the field: Google treats it as
 * spam and can suppress the rich result entirely. Anything unknown is left
 * out until a real value is supplied in STORE.
 */

/**
 * Absolute canonical URL for a path.
 *
 * Every page needs one. Without it, Google sees the www and non-www hosts, and
 * every filter and pagination permutation of /collections, as separate pages
 * competing with each other for the same terms.
 */
export function canonical(path = '/'): string {
  return appUrl(path);
}

/** The postal address, shared by the store and organization entities. */
function postalAddress() {
  return {
    '@type': 'PostalAddress',
    streetAddress: [STORE.address.line1, STORE.address.line2, STORE.address.landmark]
      .filter(Boolean)
      .join(', '),
    addressLocality: STORE.address.city,
    addressRegion: STORE.address.state,
    postalCode: STORE.address.pincode,
    addressCountry: 'IN',
  };
}

/** Official profiles, only when at least one is configured. */
function sameAs() {
  const urls = storeProfileUrls();
  return urls.length ? { sameAs: urls } : {};
}

/**
 * The shop itself — what local search ("saree shop Coimbatore") matches on.
 *
 * One entity per thing, joined by @id: the store belongs to the organization,
 * and the website is published by it. Pages that repeat this block (home and
 * /visit) repeat the same @id, so Google merges them rather than seeing two
 * shops.
 */
export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    '@id': `${appUrl()}#store`,
    name: STORE.name,
    alternateName: STORE.alternateNames,
    legalName: STORE.legalName,
    description: `Wholesale and retail saree shop on Big Bazaar Street, in the ${STORE.address.area} textile market of ${STORE.address.city}, selling ${STORE.offering} — in store, and shipped across India.`,
    url: appUrl(),
    logo: appUrl('/icon.png'),
    image: appUrl(STORE.photo ?? '/icon.png'),
    telephone: STORE.phone,
    email: STORE.email,
    address: postalAddress(),
    ...(STORE.geo
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: STORE.geo.latitude,
            longitude: STORE.geo.longitude,
          },
        }
      : {}),
    hasMap: storeMapsUrl(),
    ...(STORE.openingHours.length
      ? { openingHours: STORE.openingHours as unknown as string[] }
      : {}),
    currenciesAccepted: 'INR',
    paymentAccepted: 'Credit Card, Debit Card, UPI, Net Banking',
    areaServed: [
      { '@type': 'City', name: STORE.address.city },
      { '@type': 'Country', name: 'India' },
    ],
    parentOrganization: { '@type': 'Organization', '@id': `${appUrl()}#organization`, name: STORE.name },
    ...sameAs(),
  };
}

/** Ties the brand name to the site, which helps Google resolve brand queries. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${appUrl()}#organization`,
    name: STORE.name,
    alternateName: STORE.alternateNames,
    url: appUrl(),
    logo: appUrl('/icon.png'),
    email: STORE.email,
    address: postalAddress(),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: STORE.phone,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Tamil'],
    },
    hasMerchantReturnPolicy: returnPolicyJsonLd(),
    ...sameAs(),
  };
}

/**
 * The return policy as /returns states it.
 *
 * The category describes an ordinary return, and the shop does not take
 * those: there is no change-of-mind return, only an exchange for a piece
 * that arrived defective, brought to the shop in person. Schema.org has no
 * category for "defects only", so the honest one is NotPermitted, with the
 * link carrying the detail. Claiming a return window here would put a
 * promise in Google's results that the shop would then refuse at the counter.
 *
 * Change it only when the policy on /returns changes.
 */
export function returnPolicyJsonLd() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'IN',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    merchantReturnLink: appUrl('/returns'),
  };
}

/**
 * Delivery to India for one piece at this price.
 *
 * Rates vary by state, but Google reads regional rates only for a handful of
 * countries — not India — so a single figure has to stand for all of it.
 * That figure is the highest any state pays: quoting the Tamil Nadu rate
 * would show a Delhi customer less than checkout charges them, which is the
 * mismatch Google penalises. At or above the free-delivery threshold every
 * state pays nothing, and then the figure is exact.
 *
 * Times are the ones /shipping publishes: despatched within 3 days, then 2 to
 * 10 working days in transit depending on the region.
 */
function shippingDetailsJsonLd(price: number, settings: ShippingSettings) {
  const rate = Math.max(...INDIAN_STATES.map((s) => shippingFor(price, s, settings, 1)));
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: rate, currency: 'INR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 3, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 10, unitCode: 'DAY' },
    },
  };
}

/** Puts the trail into search results instead of a bare URL. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: appUrl(item.path),
    })),
  };
}

/** Lets Google surface the site's own search box under the brand result. */
export function searchActionJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${appUrl()}#website`,
    url: appUrl(),
    name: STORE.name,
    alternateName: STORE.alternateNames,
    inLanguage: 'en-IN',
    publisher: { '@id': `${appUrl()}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: appUrl('/collections?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * A single piece, built only from what its page shows.
 *
 * No brand: the shop is the seller, not the maker, and naming it as the brand
 * of every saree would be a claim nobody can stand behind. The seller points
 * at the organization by @id instead of restating it.
 *
 * The SKU is the product's id: the shop's own identifier for the piece, which
 * is all the field asserts. (Only variants carry a separate SKU code.)
 */
export function productJsonLd(product: Product, shipping: ShippingSettings) {
  const soldOut = product.is_sold_out || product.stock_quantity <= 0;
  const price = effectivePrice(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id,
    description: product.description ?? undefined,
    image: product.images,
    ...(product.categories?.name ? { category: product.categories.name } : {}),
    offers: {
      '@type': 'Offer',
      url: canonical(`/product/${product.id}`),
      price,
      priceCurrency: 'INR',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', '@id': `${appUrl()}#organization`, name: STORE.name },
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      shippingDetails: shippingDetailsJsonLd(price, shipping),
      hasMerchantReturnPolicy: returnPolicyJsonLd(),
    },
  };
}

/**
 * FAQ rich result.
 *
 * Every answer must also appear as visible text on the page — Google checks,
 * and markup that promises content the page does not show is treated as spam.
 */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** Renders one or more JSON-LD blocks. */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
