import type { Metadata } from 'next';
import { Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { ProsePage } from '@/components/store/prose-page';
import { STORE, whatsappUrl } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Reach ${STORE.name} in Coimbatore by phone, WhatsApp or email.`,
};

export default function ContactPage() {
  return (
    <ProsePage
      eyebrow="We would like to hear from you"
      title="Contact Us"
      intro="Someone from the family answers the phone between 10am and 8pm, every day except Sunday."
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
          Icon={Mail}
          label="Email"
          value={STORE.email}
          href={`mailto:${STORE.email}`}
        />
        <ContactCard
          Icon={MapPin}
          label="Visit"
          value={`${STORE.address.line1}, ${STORE.address.line2}`}
        />
      </div>

      <h2>Before you write</h2>
      <p>
        If your question is about an order, include the order ID from your confirmation email — it
        lets us pull up the exact piece, the weaver and the courier docket in one go.
      </p>

      <h2>Store hours</h2>
      <ul>
        <li>Monday to Saturday, 10:00 – 20:00 IST</li>
        <li>Sunday closed, though WhatsApp messages are read</li>
        <li>Orders placed on a Sunday are packed on Monday morning</li>
      </ul>

      <h2>Wholesale and bridal appointments</h2>
      <p>
        For trousseau selections we set aside an hour and bring pieces out that are not on the
        website. Call ahead so we can have the right weaves ready.
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
