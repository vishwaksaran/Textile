import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/store/prose-page';
import { STORE, storeAddressLines } from '@/lib/config';
import { JsonLd, canonical, faqJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/faq') },
  title: 'Saree Buying Questions Answered',
  description:
    'How to tell a genuine Kanchipuram saree, what Silk Mark certifies, the difference between pure and tested zari, and how delivery and returns work.',
};

/**
 * Every answer here is drawn from what the shop already publishes on its
 * authenticity, shipping and returns pages. Nothing is invented to catch a
 * search term: an FAQ that answers a question the shop cannot actually
 * honour costs more in returns and trust than it wins in traffic.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'How can I tell whether a Kanchipuram silk saree is genuine?',
    a: 'Look at the border join and the weave. A real Kanchipuram korvai border is woven separately and interlocked with the body, so the join is visible where the two meet. Handloom cloth also carries small irregularities across the weave, where powerloom output is uniform. Every piece we ship carries a card naming the weaver, the cluster, the loom type and the date it came off the loom.',
  },
  {
    q: 'What is Silk Mark, and do your sarees carry it?',
    a: 'Silk Mark is a hologram issued by the Silk Mark Organisation of India certifying pure silk. Our pure mulberry silk pieces carry it, stitched to the pallu rather than glued, and each hologram has its own serial number.',
  },
  {
    q: 'What is the difference between pure zari and tested zari?',
    a: 'Pure zari is silver thread with a gold wash wound on a silk core — heavier, warmer in tone, and it ages rather than flakes. Half-fine zari has a lower silver content and is priced accordingly. Tested zari is copper-based and used on lighter pieces. Whichever is used, it is stated on the product page.',
  },
  {
    q: 'Where is your saree shop in Coimbatore?',
    a: `${STORE.name} is at ${storeAddressLines().join(', ')}. You can also reach us on ${STORE.phone}.`,
  },
  {
    q: 'Do you deliver sarees across India?',
    a: 'Yes. Orders are packed and handed to the courier, usually within two working days, and tracking reaches you by WhatsApp and SMS the moment the parcel ships.',
  },
  {
    q: 'Can I return a saree if it is not what I expected?',
    a: 'Yes, within the return window, provided the piece is unworn and unwashed with its authenticity card. Separately and without any time limit: if a piece is ever shown not to match what we described, send it back and we refund in full, including what you paid to ship it.',
  },
  {
    q: 'How do I track my order?',
    a: 'Use the order ID from your confirmation together with the mobile number you gave at checkout, on the Track Order page. Tracking details also reach you by WhatsApp and SMS as soon as the parcel leaves us.',
  },
  {
    q: 'Why do two sarees of the same design look slightly different?',
    a: 'Because they were woven by hand. Slight variation in the weave, and in dye taken up between batches, is characteristic of handloom cloth rather than a fault — it is the difference between a woven piece and a printed one.',
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(FAQS)} />

      <ProsePage
        eyebrow="Before you buy"
        title="Questions, Answered"
        intro="What people ask us most about silk, zari, delivery and returns — answered plainly."
      >
        {FAQS.map(({ q, a }) => (
          <div key={q}>
            <h2>{q}</h2>
            <p>{a}</p>
          </div>
        ))}

        <h2>Still unsure?</h2>
        <p>
          Call {STORE.phone}, or read more about how we verify what we sell on our{' '}
          <Link href="/authenticity">authenticity guarantee</Link> page. Delivery and returns are
          set out in full under <Link href="/shipping">shipping</Link> and{' '}
          <Link href="/returns">returns</Link>.
        </p>
      </ProsePage>
    </>
  );
}
