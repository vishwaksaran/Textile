import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { STORE, whatsappUrl } from '@/lib/config';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/returns') },
  title: 'Return & Exchange Policy',
  description:
    'Exchanges for defective pieces only, raised on WhatsApp within 3 working days of delivery, with an unboxing video.',
};

export default function ReturnsPage() {
  return (
    <ProsePage
      eyebrow="Before you order"
      title="Return & Exchange Policy"
      intro="Every piece is checked by hand before it is packed. If something is genuinely wrong with what arrives, tell us within three working days and we will put it right."
    >
      <h2>Delivery time</h2>
      <p>
        Orders are despatched within 3 days. Delivery then takes{' '}
        <strong>3 to 10 days depending on your location</strong>, by insured courier,
        anywhere in India.
      </p>

      <h2>What we accept</h2>
      <ul>
        <li>
          <strong>Exchange for defective pieces only</strong> — a weaving fault, a tear, or
          damage in transit.
        </li>
        <li>
          <strong>Raised within 3 working days</strong> of the delivery date. After that we
          cannot take the piece back.
        </li>
        <li>The piece unworn and unwashed, with its tags and authenticity card attached.</li>
      </ul>

      <h2>What we cannot accept</h2>
      <ul>
        <li>
          <strong>No returns for size, style or preference.</strong> If you are unsure about a
          piece, message us before ordering and we will send more photographs or a video.
        </li>
        <li>Sarees that have been cut, stitched, pre-pleated, or had a fall attached.</li>
        <li>Blouse pieces or churidar material that has been cut.</li>
        <li>Pieces marked as final sale at the time of purchase.</li>
      </ul>

      <h2>An unboxing video is required</h2>
      <p>
        <strong>
          We can only accept an exchange if you send us a video of the parcel being opened.
        </strong>{' '}
        Start recording before the packaging is cut and keep filming in one take until the
        piece is fully unfolded, with the fault visible.
      </p>
      <p>
        This is not red tape. A saree can be damaged in transit or on the way back, and the
        video is the only thing that shows the condition it reached you in. Without it we
        have no way to raise a claim with the courier, and we cannot process the exchange.
      </p>

      <h2>How to raise it — WhatsApp only</h2>
      <p>
        <strong>
          Exchanges are handled entirely on <a href={whatsappUrl()}>WhatsApp</a>, on{' '}
          {STORE.phone}.
        </strong>{' '}
        Not by email, and not through a form on this site — so that a real person sees the
        video and the piece, and can answer you the same day.
      </p>
      <p>Send us, in one message:</p>
      <ul>
        <li>Your order ID, from your invoice or the confirmation message.</li>
        <li>The unboxing video, unedited.</li>
        <li>A photograph of the fault in daylight.</li>
      </ul>
      <p>
        We reply with a reverse pickup where the courier serves your pincode, and a prepaid
        label everywhere else. Once the piece reaches us and the fault is confirmed, we send
        the replacement, or refund through Razorpay to the method you paid with if no
        replacement is available. Banks typically take five to seven working days after that.
      </p>

      <h2>Handloom is not uniform</h2>
      <p>
        Slubs in khadi, small variations in a block print, and a border that shifts by a few
        millimetres across a saree are characteristics of hand weaving, not defects.
      </p>
      <p>
        <strong>
          Slight colour differences may also occur because of lighting and your screen.
        </strong>{' '}
        We photograph every piece as it is, in daylight, without retouching the colour — but
        no two displays render a maroon the same way. If the exact shade matters, ask us on
        WhatsApp before you order and we will send a video in natural light.
      </p>

      <h2>Need help deciding?</h2>
      <p>
        <a href={whatsappUrl()}>Message us on WhatsApp</a> or call {STORE.phone}. We would far
        rather spend ten minutes helping you choose the right piece than process an exchange
        afterwards.
      </p>
    </ProsePage>
  );
}
