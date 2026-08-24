import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { STORE } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Returns & Exchanges',
  description: 'Our seven-day return window, what qualifies, and how refunds are made.',
};

export default function ReturnsPage() {
  return (
    <ProsePage
      eyebrow="If it is not right"
      title="Returns & Exchanges"
      intro="Seven days from delivery, no questions about taste — only about condition."
    >
      <h2>What we accept</h2>
      <ul>
        <li>Unworn pieces, with the tags and the authenticity card still attached.</li>
        <li>The original packaging, or something equally protective.</li>
        <li>A request raised within seven days of the delivery date.</li>
      </ul>

      <h2>What we cannot accept</h2>
      <ul>
        <li>Sarees that have been cut, stitched, pre-pleated, or had a fall attached.</li>
        <li>Blouse pieces that have been cut from the saree.</li>
        <li>Pieces marked as final sale at the time of purchase.</li>
      </ul>

      <h2>Handloom is not uniform</h2>
      <p>
        Slubs in khadi, small variations in a block print, and a border that shifts by a few
        millimetres across a saree are characteristics of hand weaving, not defects. We photograph
        every piece as it is; if you would like more images before buying, ask.
      </p>

      <h2>How to start a return</h2>
      <p>
        Write to <a href={`mailto:${STORE.email}`}>{STORE.email}</a> or WhatsApp us on{' '}
        {STORE.phone} with your order ID and a photograph. We arrange a reverse pickup where the
        courier serves your pincode, and share a prepaid label everywhere else.
      </p>

      <h2>Refunds</h2>
      <p>
        Once the piece reaches us and passes inspection, the refund goes back through Razorpay to
        the same method you paid with. Banks typically take five to seven working days after that.
        Shipping charges are refunded only when the return is our error.
      </p>

      <h2>Exchanges</h2>
      <p>
        Because each piece is one of a kind, an exchange is really a return plus a new order. We
        will hold the piece you want for 48 hours while the first one travels back.
      </p>
    </ProsePage>
  );
}
