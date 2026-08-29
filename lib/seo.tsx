import { STORE, appUrl } from '@/lib/config';

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

/** The shop itself — what local search ("saree shop Coimbatore") matches on. */
export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    '@id': `${appUrl()}#store`,
    name: STORE.name,
    legalName: STORE.legalName,
    description: `Retail saree showroom on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}. Handloom silk sarees sourced from weaving clusters across India — Kanchipuram, Banarasi, khadi cotton and bridal weaves — sold in store and shipped nationwide.`,
    url: appUrl(),
    logo: appUrl('/icon.png'),
    image: appUrl('/icon.png'),
    telephone: STORE.phone,
    email: STORE.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [STORE.address.line1, STORE.address.line2, STORE.address.landmark]
        .filter(Boolean)
        .join(', '),
      addressLocality: STORE.address.city,
      addressRegion: STORE.address.state,
      postalCode: STORE.address.pincode,
      addressCountry: 'IN',
    },
    ...(STORE.openingHours.length
      ? { openingHours: STORE.openingHours as unknown as string[] }
      : {}),
    currenciesAccepted: 'INR',
    paymentAccepted: 'Credit Card, Debit Card, UPI, Net Banking',
    areaServed: [
      { '@type': 'City', name: STORE.address.city },
      { '@type': 'Country', name: 'India' },
    ],
    // The neighbourhood, stated plainly for local search.
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
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: STORE.phone,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Tamil'],
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
