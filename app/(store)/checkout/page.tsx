import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { CheckoutForm } from '@/components/store/checkout-form';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs
          trail={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
        />
      </div>
      <CheckoutForm />
    </>
  );
}
