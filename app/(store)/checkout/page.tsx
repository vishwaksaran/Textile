import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { CheckoutForm } from '@/components/store/checkout-form';
import { getShippingSettings } from '@/lib/shipping-settings';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
};

// Rates are read per request rather than baked in: an admin who changes the
// charge for a zone must not have it apply to some customers and not others.
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const shippingSettings = await getShippingSettings();

  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs
          trail={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
        />
      </div>
      <CheckoutForm shippingSettings={shippingSettings} />
    </>
  );
}
