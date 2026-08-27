import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { TrackOrder } from '@/components/store/track-order';
import { Skeleton } from '@/components/shared/skeleton';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/track') },
  title: 'Track Your Order',
  description: 'Look up the status of a Sri Laxmi Silks order with your order ID.',
};

export default function TrackPage() {
  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Track Order' }]} />
      </div>

      <div className="container-page py-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
            Where is my parcel?
          </p>
          <h1 className="mb-4 font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[42px]">
            Track Your Order
          </h1>
          <p className="mb-10 font-body-md text-body-md text-on-surface-variant">
            Enter the order ID from your confirmation email. We also send tracking by WhatsApp and
            SMS the moment your parcel is handed to the courier.
          </p>
        </div>

        <Suspense fallback={<Skeleton className="mx-auto h-40 max-w-xl" />}>
          <TrackOrder />
        </Suspense>
      </div>
    </>
  );
}
