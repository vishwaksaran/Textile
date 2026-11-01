import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Phone, MessageCircle } from 'lucide-react';
import { ProsePage } from '@/components/store/prose-page';
import { Button } from '@/components/ui/button';
import {
  STORE,
  storeAddressLines,
  storeHoursLines,
  storeMapsUrl,
  whatsappUrl,
} from '@/lib/config';
import { JsonLd, canonical, storeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/visit') },
  title: `Saree Shop in ${STORE.address.area}, ${STORE.address.city}`,
  description: `Visit our saree shop on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city} — address, opening hours, directions and phone. Retail and wholesale buyers welcome.`,
};

/**
 * The shop's own page.
 *
 * Deliberately not a keyword landing page: it exists because a physical
 * showroom is the thing that distinguishes this business, and someone
 * searching for a saree shop nearby needs the address, the landmark and a
 * phone number more than they need prose.
 *
 * It repeats the ClothingStore markup so the address travels with the page a
 * local searcher is most likely to land on.
 */
export default function VisitPage() {
  return (
    <>
      <JsonLd data={storeJsonLd()} />

      <ProsePage
        eyebrow="Come and see the cloth"
        title={`Our Shop in ${STORE.address.area}`}
        path="/visit"
        intro={`Silk is difficult to judge from a photograph. If you are in ${STORE.address.city}, the whole range is on the shelf.`}
      >
        <h2 id="address">Where to find us</h2>
        <address className="not-italic">
          {storeAddressLines().map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>

        <p>
          We are on Big Bazaar Street, in the {STORE.address.area} area — near Pothys, a few
          minutes from the Town Hall bus stop. Look for Murugan Shopping Complex; we are at
          number 42.
        </p>

        <h2 id="hours">When we are open</h2>
        <ul>
          {storeHoursLines().map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>Closed on Sunday.</li>
        </ul>

        <div className="not-prose my-8 flex flex-wrap gap-3">
          <Button asChild>
            <a
              href={storeMapsUrl()}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="h-4 w-4" />
              Open in Maps
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${STORE.phone.replace(/\s/g, '')}`}>
              <Phone className="h-4 w-4" />
              {STORE.phone}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={whatsappUrl()} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp us
            </a>
          </Button>
        </div>

        <h2 id="range">What is on the shelf</h2>
        <p>
          We keep {STORE.offering}. Most of what is in the shop is also listed{' '}
          <Link href="/collections">online</Link>, with prices.
        </p>

        <h2 id="wholesale">Wholesale</h2>
        <p>
          The shop serves both wholesale and retail buyers. This website lists retail prices
          only — <Link href="/wholesale">send a wholesale enquiry</Link> or call {STORE.phone}{' '}
          and we will quote for your quantity.
        </p>

        <h2 id="from-a-distance">Buying from a distance</h2>
        <p>
          If you cannot visit, everything on the site ships across India, and we will answer
          questions about fabric, colour or drape over <a href={whatsappUrl()}>WhatsApp</a> before
          you commit to a piece. Read more on{' '}
          <Link href="/authenticity">how we describe our sarees</Link>, or the{' '}
          <Link href="/faq">questions we are asked most</Link>.
        </p>
      </ProsePage>
    </>
  );
}
