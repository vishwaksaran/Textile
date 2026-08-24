import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { CartView } from '@/components/store/cart-view';

export const metadata: Metadata = {
  title: 'Your Cart',
  robots: { index: false },
};

export default function CartPage() {
  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
      </div>
      <CartView />
    </>
  );
}
