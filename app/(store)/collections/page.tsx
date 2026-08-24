import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListingView } from '@/components/store/listing-view';
import { ProductGridSkeleton } from '@/components/shared/skeleton';
import { Breadcrumbs } from '@/components/store/breadcrumbs';

export const metadata: Metadata = {
  title: 'All Collections',
  description:
    'Every weave in the house — Kanchipuram, Banarasi, khadi cotton, bridal silks and archival revivals.',
};

export default function CollectionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'All Collections' }]} />
      </div>

      <header className="container-page py-10 text-center">
        <p className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
          The Full Catalogue
        </p>
        <h1 className="mb-4 font-display-lg text-display-lg-mobile italic text-deep-maroon md:text-[44px] md:leading-[52px]">
          Every Weave in the House
        </h1>
        <p className="mx-auto max-w-2xl font-body-md text-body-md text-on-surface-variant">
          Filter by price, weave and availability. Everything listed here is in our Coimbatore
          store and ships within two working days.
        </p>
      </header>

      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={
          <div className="container-page py-10">
            <ProductGridSkeleton />
          </div>
        }
      >
        <ListingView searchParams={searchParams} />
      </Suspense>
    </>
  );
}
