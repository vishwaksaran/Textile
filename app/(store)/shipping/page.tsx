import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { COMMERCE } from '@/lib/config';
import { formatINR } from '@/lib/utils';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/shipping') },
  title: 'Shipping Policy',
  description: 'Dispatch times, courier partners, charges and delivery windows.',
};

export default function ShippingPage() {
  return (
    <ProsePage
      eyebrow="Getting it to you"
      title="Shipping Policy"
      intro="Everything is insured, packed in muslin, and tracked door to door."
    >
      <h2>Charges</h2>
      <ul>
        <li>
          Free shipping on orders of {formatINR(COMMERCE.freeShippingThreshold)} and above.
        </li>
        <li>
          Below that, delivery is charged by distance — least within Tamil Nadu, most to the
          north-east and the islands. The exact figure for your address appears at checkout,
          before you pay.
        </li>
        <li>International orders are quoted individually — write to us before paying.</li>
      </ul>

      <h2>Dispatch</h2>
      <p>
        Orders placed before 4pm are usually packed the same day and handed to the courier within
        three days. Delivery then takes 3 to 10 days depending on your location.
      </p>

      <h2>Courier partners</h2>
      <p>
        We ship through Delhivery, Blue Dart, DTDC, India Post, Ekart and Shadowfax, choosing by
        which serves your pincode best. You do not get to pick the courier, but you always get the
        tracking ID.
      </p>

      <h2>Tracking</h2>
      <p>
        The moment your parcel leaves us, the tracking ID reaches you three ways: a WhatsApp
        message, an SMS and an email. You can also look it up any time on our{' '}
        <a href="/track">track order</a> page using your order ID.
      </p>

      <h2>Delivery windows</h2>
      <ul>
        <li>Tamil Nadu and Kerala — 2 to 3 working days</li>
        <li>Rest of South and West India — 3 to 5 working days</li>
        <li>North and East India — 4 to 7 working days</li>
        <li>North-east, Andaman and remote pincodes — 7 to 10 working days</li>
      </ul>

      <h2>If something goes wrong</h2>
      <p>
        Parcels are insured. If a shipment is lost or arrives damaged, tell us within 48 hours of
        the delivery date with photographs of the packaging, and we will replace the piece or
        refund you in full.
      </p>
    </ProsePage>
  );
}
