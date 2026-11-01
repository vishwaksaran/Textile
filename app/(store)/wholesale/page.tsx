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
  title: `Wholesale Saree Supplier in ${STORE.address.city}`,
  description: `Wholesale sarees in ${STORE.address.city} from ${STORE.name}, Big Bazaar Street, ${STORE.address.area}. Cotton, tissue, tussar and more for shops across India.`,
};

/** Restates the process below; promises nothing the shop has not said. */
const FAQS: { id: string; q: string; a: string }[] = [
  {
    id: 'where',
    q: `Where can I buy wholesale sarees in ${STORE.address.city}?`,
    a: `${STORE.name} supplies sarees wholesale from Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}. Send the enquiry form on this page or call ${STORE.phone}.`,
  },
  {
    id: 'outside-coimbatore',
    q: 'Do you supply shops outside Coimbatore?',
    a: 'Yes. Wholesale orders are packed and shipped insured to shops anywhere in India.',
  },
  {
    id: 'budget',
    q: 'Do you have budget sarees for resale?',
    a: 'Yes — cotton, tussar, tissue cotton and linen sarees for everyday wear. Tell us your price range and quantity and we will quote.',
  },
  {
    id: 'prices',
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
      path="/wholesale"
      intro={`${STORE.name} supplies sarees to shops across India from our Town Hall, ${STORE.address.city} showroom. Tell us what you need and we will call back with prices for your quantity.`}
    >
      <LeadForm
        product={product ? { id: product.id, name: product.name } : null}
        initialKind={searchParams.kind === 'retail' ? 'retail' : 'wholesale'}
      />

      <h2 id="what-we-supply">What we supply</h2>
      <ul>
        <li>
          Cotton, <Link href="/category/khadi-cotton">khadi cotton</Link>,{' '}
          <Link href="/category/tissuecotton">tissue cotton</Link> and linen sarees for everyday
          wear
        </li>
        <li>
          <Link href="/category/semi-handloom-tussar">Semi-handloom tussar</Link> and Banarasi
          sarees
        </li>
        <li>
          <Link href="/category/churidars">Churidar sets</Link> and dress materials
        </li>
        <li>Mixed assortments for a new shop or a festival season</li>
      </ul>

      <h2 id="how-it-works">How it works</h2>
      <ul>
        <li>Send the form above, or <a href={whatsappUrl('Hello, I would like wholesale prices for sarees.')}>message us on WhatsApp</a>.</li>
        <li>We call back within one working day to understand your shop, price range and quantity.</li>
        <li>We send photos and videos of current stock, or you visit the showroom and choose in person.</li>
        <li>Your order is packed and shipped insured, anywhere in India.</li>
      </ul>

      <h2 id="visit">Prefer to see the cloth first?</h2>
      <p>
        Wholesale buyers are welcome at the shop — see <Link href="/visit">how to find us</Link>,
        or call {STORE.phone} before you travel so we can have the right weaves ready. Looking
        for lower price points? See our <Link href="/budget-sarees">budget-friendly sarees</Link>.
      </p>

      <h2 id="questions">Questions from wholesale buyers</h2>
      {FAQS.map(({ id, q, a }) => (
        <div key={id}>
          <h3 id={id}>{q}</h3>
          <p>{a}</p>
        </div>
      ))}
    </ProsePage>
    </>
  );
}
