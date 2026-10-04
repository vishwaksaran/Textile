import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/store/prose-page';
import { LeadForm } from '@/components/store/lead-form';
import { getProductById } from '@/lib/data';
import { STORE, whatsappUrl } from '@/lib/config';
import { JsonLd, canonical, faqJsonLd } from '@/lib/seo';

/*
  Titled for what a reseller types into Google, not for what the shop calls
  the page: "wholesale silk sarees Coimbatore", "saree supplier".
*/
export const metadata: Metadata = {
  alternates: { canonical: canonical('/wholesale') },
  title: `Wholesale Sarees in ${STORE.address.city} — Silk & Cotton Supplier`,
  description: `Wholesale sarees in ${STORE.address.city} from ${STORE.name}, Big Bazaar Street, ${STORE.address.area}. Silk, cotton, tussar and budget sarees for shops and resellers across India. Send an enquiry for prices.`,
};

/** Restates the process below; promises nothing the shop has not said. */
const FAQS: { q: string; a: string }[] = [
  {
    q: `Where can I buy wholesale sarees in ${STORE.address.city}?`,
    a: `${STORE.name} supplies sarees wholesale from Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}. Send the enquiry form on this page or call ${STORE.phone}.`,
  },
  {
    q: 'Do you supply shops outside Coimbatore?',
    a: 'Yes. Wholesale orders are packed and shipped insured to shops anywhere in India.',
  },
  {
    q: 'Do you have budget sarees for resale?',
    a: 'Yes — cotton, tussar and tissue sarees for everyday wear, alongside silk. Tell us your price range and quantity and we will quote.',
  },
  {
    q: 'How do I get wholesale prices?',
    a: 'Send the form with your city and roughly how many pieces you need. We call back within one working day with prices for that quantity.',
  },
];

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: { product?: string; kind?: string };
}) {
  // Arriving from a product page pre-fills which piece they were looking at.
  const product = searchParams.product ? await getProductById(searchParams.product) : null;

  return (
    <>
    <JsonLd data={faqJsonLd(FAQS)} />
    <ProsePage
      eyebrow="For shops, boutiques and resellers"
      title={`Wholesale Sarees in ${STORE.address.city}`}
      intro={`${STORE.name} supplies sarees to shops across India from our Town Hall, ${STORE.address.city} showroom. Tell us what you need and we will call back with prices for your quantity.`}
    >
      <LeadForm
        product={product ? { id: product.id, name: product.name } : null}
        initialKind={searchParams.kind === 'retail' ? 'retail' : 'wholesale'}
      />

      <h2>What we supply</h2>
      <ul>
        <li>Kanchipuram silk, Banarasi and soft silk sarees</li>
        <li>Khadi and cotton sarees for everyday wear</li>
        <li>Bridal and trousseau selections</li>
        <li>Mixed assortments for a new shop or a festival season</li>
      </ul>

      <h2>How it works</h2>
      <ul>
        <li>Send the form above, or <a href={whatsappUrl('Hello, I would like wholesale prices for sarees.')}>message us on WhatsApp</a>.</li>
        <li>We call back within one working day to understand your shop, price range and quantity.</li>
        <li>We send photos and videos of current stock, or you visit the showroom and choose in person.</li>
        <li>Your order is packed and shipped insured, anywhere in India.</li>
      </ul>

      <h2>Prefer to see the cloth first?</h2>
      <p>
        Wholesale buyers are welcome at the shop — see <Link href="/visit">how to find us</Link>,
        or call {STORE.phone} before you travel so we can have the right weaves ready. Looking
        for lower price points? See our <Link href="/budget-sarees">budget-friendly sarees</Link>.
      </p>

      <h2>Questions from wholesale buyers</h2>
      {FAQS.map(({ q, a }) => (
        <div key={q}>
          <p>
            <strong>{q}</strong>
          </p>
          <p>{a}</p>
        </div>
      ))}
    </ProsePage>
    </>
  );
}
