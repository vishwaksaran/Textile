import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { ProductGrid } from '@/components/store/product-grid';
import { AnimatedPage } from '@/components/shared/motion';
import { Button } from '@/components/ui/button';
import { getProducts } from '@/lib/data';
import { STORE, whatsappUrl } from '@/lib/config';
import { JsonLd, breadcrumbJsonLd, canonical, faqJsonLd } from '@/lib/seo';

export const revalidate = 300;

/** The ceiling the page promises. Every piece listed is at or under it. */
const BUDGET = 1000;

/*
  A real listing, not a page written to catch a search term: the products
  shown are the shop's own pieces under the price in the title, so the
  page answers the query it ranks for. The shop's catalogue is mostly
  cotton, tussar and tissue sarees in this range.
*/
export const metadata: Metadata = {
  alternates: { canonical: canonical('/budget-sarees') },
  title: `Budget-Friendly Sarees in ${STORE.address.city} — Under ₹${BUDGET.toLocaleString('en-IN')}`,
  description: `Affordable cotton, tussar and tissue sarees under ₹${BUDGET.toLocaleString('en-IN')} from ${STORE.name}, ${STORE.address.area} ${STORE.address.city}. Buy in store or online with delivery across India. Wholesale rates for shops.`,
};

/**
 * Every answer restates what the shop already publishes on its shipping,
 * returns and wholesale pages — nothing here promises more than those do.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: `Where can I buy budget-friendly sarees in ${STORE.address.city}?`,
    a: `At ${STORE.name} on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}. Every saree on this page is under ₹${BUDGET.toLocaleString('en-IN')}, and you can buy it in the shop or order it here online.`,
  },
  {
    q: 'Do you deliver outside Coimbatore?',
    a: 'Yes. Orders are shipped insured to anywhere in India, and tracking reaches you by WhatsApp as soon as the parcel leaves us.',
  },
  {
    q: 'Can shops buy these sarees at wholesale rates?',
    a: 'Yes. We supply shops and resellers. Send a wholesale enquiry with the quantity you need and we will call back with prices.',
  },
  {
    q: 'Can I see more pieces before I buy?',
    a: 'Message us on WhatsApp and we will send photos or a video of what is in stock, or visit the shop and choose in person.',
  },
];

export default async function BudgetSareesPage() {
  const { products } = await getProducts({ maxPrice: BUDGET, sort: 'price-asc', limit: 48 });

  return (
    <AnimatedPage>
      <JsonLd
        data={[
          faqJsonLd(FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Budget Sarees', path: '/budget-sarees' },
          ]),
        ]}
      />

      <div className="container-page pt-6">
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Budget Sarees' }]} />
      </div>

      <section className="container-page py-10">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
            Under ₹{BUDGET.toLocaleString('en-IN')}
          </p>
          <h1 className="mb-5 font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[44px] md:leading-[52px]">
            Budget-Friendly Sarees in {STORE.address.city}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Cotton, tussar and tissue sarees for everyday wear, office and gifting — every piece
            here is under ₹{BUDGET.toLocaleString('en-IN')}. Shop in store at {STORE.address.area}{' '}
            or order online with delivery across India.
          </p>
        </header>

        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="text-center font-body-md text-body-md text-on-surface-variant">
            New pieces in this range are being added.{' '}
            <a href={whatsappUrl()} className="text-deep-maroon underline">
              Message us on WhatsApp
            </a>{' '}
            to see what is in the shop today.
          </p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/collections">See all sarees</Link>
          </Button>
          <Button asChild>
            <Link href="/wholesale">Buying for a shop? Get wholesale prices</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-outline-variant/30 bg-surface-container-low py-16">
        <div className="container-page mx-auto max-w-2xl space-y-6 font-body-md text-body-md leading-relaxed text-on-surface-variant">
          <h2 className="font-headline-md text-headline-md text-deep-maroon">
            Affordable sarees from {STORE.address.area}, {STORE.address.city}
          </h2>
          <p>
            {STORE.name} is a saree shop on Big Bazaar Street, {STORE.address.area} — the heart
            of {STORE.address.city}&rsquo;s cloth market. Alongside silk, we keep a wide range of
            cotton and blended sarees at prices meant for daily wear, so a good saree does not
            have to wait for a wedding.
          </p>

          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <h3 className="pb-1 font-body-md text-body-md font-semibold text-deep-maroon">{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>
    </AnimatedPage>
  );
}
