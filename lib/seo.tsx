import { STORE, appUrl, storeMapsUrl, storeProfileUrls } from '@/lib/config';
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
    legalName: STORE.legalName,
    description: `Wholesale and retail saree shop on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}, selling ${STORE.offering} — in store, and shipped across India.`,
    url: appUrl(),
    logo: appUrl('/icon.png'),
    image: appUrl('/icon.png'),
    telephone: STORE.phone,
    email: STORE.email,
    address: postalAddress(),
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
    ...sameAs(),
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
 */
export function productJsonLd(product: Product) {
  const soldOut = product.is_sold_out || product.stock_quantity <= 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.images,
    ...(product.categories?.name ? { category: product.categories.name } : {}),
    offers: {
      '@type': 'Offer',
      url: canonical(`/product/${product.id}`),
      price: effectivePrice(product),
      priceCurrency: 'INR',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', '@id': `${appUrl()}#organization`, name: STORE.name },
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
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
