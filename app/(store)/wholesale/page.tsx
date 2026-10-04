import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/store/prose-page';
import { LeadForm } from '@/components/store/lead-form';
import { getProductById } from '@/lib/data';
import { STORE, whatsappUrl } from '@/lib/config';
import { canonical } from '@/lib/seo';

/*
  Titled for what a reseller types into Google, not for what the shop calls
  the page: "wholesale silk sarees Coimbatore", "saree supplier".
*/
export const metadata: Metadata = {
  alternates: { canonical: canonical('/wholesale') },
  title: `Wholesale Silk Sarees Supplier in ${STORE.address.city}`,
  description: `Buy Kanchipuram, Banarasi, soft silk and cotton sarees wholesale from ${STORE.name}, ${STORE.address.area} ${STORE.address.city}. Send an enquiry and we will call back with prices for your quantity.`,
};

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: { product?: string; kind?: string };
}) {
  // Arriving from a product page pre-fills which piece they were looking at.
  const product = searchParams.product ? await getProductById(searchParams.product) : null;

  return (
    <ProsePage
      eyebrow="For shops, boutiques and resellers"
      title="Wholesale & Bulk Enquiries"
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
        or call {STORE.phone} before you travel so we can have the right weaves ready.
      </p>
    </ProsePage>
  );
}
