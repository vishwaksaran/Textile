import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/store/prose-page';
import { STORE, storeAddressLines, storeHoursLines } from '@/lib/config';
import { JsonLd, canonical, faqJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/faq') },
  title: 'Saree Shopping Questions Answered',
  description:
    'Where our Coimbatore shop is, what sarees we sell, opening hours, payment, delivery across India, exchanges and order tracking — answered plainly.',
};

/**
 * Every answer here is drawn from what the shop already publishes on its
 * shipping, returns and contact pages, or from config. Nothing is invented to
 * catch a search term: an FAQ that answers a question the shop cannot
 * actually honour costs more in returns and trust than it wins in traffic.
 *
 * `id` is the anchor each question is reachable at, so an answer elsewhere on
 * the site — or in a search result — can link straight to it.
 */
const FAQS: { id: string; q: string; a: string }[] = [
  {
    id: 'location',
    q: 'Where is Sri Laxmi Silks in Coimbatore?',
    a: `${STORE.name} is at ${storeAddressLines().join(', ')}. You can also reach us on ${STORE.phone}.`,
  },
  {
    id: 'hours',
    q: 'When is the shop open?',
    a: `${storeHoursLines().join('; ')}. The shop is closed on Sunday, though WhatsApp messages are still read.`,
  },
  {
    id: 'range',
    q: 'What kinds of sarees do you sell?',
    a: `We sell ${STORE.offering}. The full range, with prices, is on the All Collections page.`,
  },
  {
    id: 'wholesale',
    q: 'Do you sell sarees wholesale?',
    a: 'Yes. The shop serves both wholesale and retail buyers. This website shows retail prices; send a wholesale enquiry with your city and quantity and we will call back with prices.',
  },
  {
    id: 'photos',
    q: 'Can I see more photos before I order?',
    a: 'Yes. Message us on WhatsApp with the piece you are looking at and we will send more photographs or a short video of it, so you know what you are buying before you pay.',
  },
  {
    id: 'payment',
    q: 'How can I pay for an online order?',
    a: 'Online orders are paid securely at checkout by credit card, debit card, UPI or net banking.',
  },
  {
    id: 'delivery',
    q: 'Do you deliver sarees across India?',
    a: 'Yes. Orders are despatched within three days, and delivery then takes three to ten days depending on your location. Tracking reaches you by WhatsApp and SMS the moment the parcel ships.',
  },
  {
    id: 'returns',
    q: 'Can I return a saree if it is not what I expected?',
    a: 'No — we do not accept returns for size, style or preference. We exchange defective pieces only, and the exchange is done in person at our Town Hall shop. Message us on WhatsApp as soon as you open the parcel, with your order ID and an unedited video of it being opened showing the fault; then bring the piece in with its tags whenever you are able to. There is no deadline on the visit, but the report needs to be prompt, because that is what lets us raise it with the courier. Exchanges cannot be completed by post or online. Ask us for extra photographs or a video before you order — far better than an exchange afterwards.',
  },
  {
    id: 'unboxing-video',
    q: 'Why do you need a video to accept an exchange?',
    a: 'A saree can be damaged in transit, and the unboxing video is the only thing that shows the condition it reached you in. Without it we cannot raise a claim with the courier. Start recording before you cut the packaging and keep filming in one take until the piece is unfolded and the fault is visible. The same video is required for a cancellation claim, so record it every time, even when nothing looks wrong.',
  },
  {
    id: 'tracking',
    q: 'How do I track my order?',
    a: 'Use the order ID from your confirmation together with the mobile number you gave at checkout, on the Track Order page. Tracking details also reach you by WhatsApp and SMS as soon as the parcel leaves us.',
  },
  {
    id: 'variation',
    q: 'Why do two sarees of the same design look slightly different?',
    a: 'Small differences in weave, and in the dye taken up between batches, are normal in handloom and semi-handloom cloth rather than a fault. Photographs can also show colour slightly differently from one screen to another — ask us for a video if the exact shade matters.',
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(FAQS)} />

      <ProsePage
        eyebrow="Before you buy"
        title="Questions, Answered"
        path="/faq"
        intro="What people ask us most about the shop, delivery and exchanges — answered plainly."
      >
        {FAQS.map(({ id, q, a }) => (
          <div key={id}>
            <h2 id={id}>{q}</h2>
            <p>{a}</p>
          </div>
        ))}

        <h2 id="more">Still unsure?</h2>
        <p>
          Call {STORE.phone}, or browse <Link href="/collections">all collections</Link>. Buying
          for a shop? Send a <Link href="/wholesale">wholesale enquiry</Link>. Delivery and
          exchanges are set out in full under <Link href="/shipping">shipping</Link> and{' '}
          <Link href="/returns">returns</Link>, and directions are on the{' '}
          <Link href="/visit">visit the shop</Link> page.
        </p>
      </ProsePage>
    </>
  );
}
