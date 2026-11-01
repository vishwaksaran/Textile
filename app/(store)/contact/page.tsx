import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { ProsePage } from '@/components/store/prose-page';
import {
  STORE,
  storeAddressLines,
  storeHoursLines,
  storeMapsUrl,
  whatsappUrl,
} from '@/lib/config';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/contact') },
  title: `Contact Us — ${STORE.address.area}, ${STORE.address.city}`,
  description: `Call or WhatsApp ${STORE.name} on ${STORE.phone}, or visit our saree shop on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}. Retail and wholesale enquiries.`,
};

export default function ContactPage() {
  return (
    <ProsePage
      eyebrow="We would like to hear from you"
      title="Contact Us"
      path="/contact"
      intro={`Call, WhatsApp or visit — we answer during shop hours: ${storeHoursLines().join('; ')}.`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ContactCard
          Icon={Phone}
          label="Call the store"
          value={STORE.phone}
          href={`tel:${STORE.phone.replace(/\s/g, '')}`}
        />
        <ContactCard
          Icon={MessageCircle}
          label="WhatsApp"
          value={STORE.phone}
          href={whatsappUrl()}
        />
        <ContactCard
          Icon={MapPin}
          label="Visit"
          value={storeAddressLines().join(', ')}
          href={storeMapsUrl()}
        />
      </div>

      <h2 id="orders">Before you get in touch</h2>
      <p>
        If your question is about an order, send the order ID from your confirmation — it
        lets us pull up the exact piece and the courier docket in one go. You can also{' '}
        <Link href="/track">track your order</Link> yourself.
      </p>

      <h2 id="hours">Store hours</h2>
      <ul>
        {storeHoursLines().map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>Sunday closed, though WhatsApp messages are read</li>
        <li>Orders placed on a Sunday are packed on Monday morning</li>
      </ul>

      <h2 id="wholesale">Wholesale enquiries</h2>
      <p>
        Buying for a shop? <Link href="/wholesale">Send a wholesale enquiry</Link> and we will
        call back with prices for your quantity. If you plan to visit, call ahead so we can have
        the right pieces ready.
      </p>

      <h2 id="directions">Finding the shop</h2>
      <p>
        Directions, landmarks and a map link are on the <Link href="/visit">visit the shop</Link>{' '}
        page. Common questions are answered on the <Link href="/faq">FAQ</Link>.
      </p>
    </ProsePage>
  );
}

function ContactCard({
  Icon,
  label,
  value,
  href,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <Icon className="h-5 w-5 text-earthy-bronze" strokeWidth={1.5} />
      <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <span className="font-body-md text-body-md text-deep-maroon">{value}</span>
    </>
  );

  const className =
    'flex flex-col gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5 no-underline transition-colors hover:border-primary-container';

  return href ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}
