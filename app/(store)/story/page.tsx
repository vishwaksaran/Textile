import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { ARTISAN_IMAGE } from '@/lib/demo-data';
import { STORE, storeHoursLines, whatsappUrl } from '@/lib/config';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/story') },
  title: `About Us — Saree Shop in ${STORE.address.area}, ${STORE.address.city}`,
  description: `${STORE.name} is a wholesale and retail saree shop on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}. Cotton, tissue and tussar sarees, in store and online.`,
};

/**
 * Who the shop is, stated only in facts the business has confirmed: where it
 * is, who it sells to and what is on the shelf. No sourcing stories, awards
 * or guarantees — an About page is what search engines and AI answers quote
 * when asked about a business, so every line here has to be true.
 */
export default function StoryPage() {
  return (
    <ProsePage
      eyebrow="About us"
      title="About Sri Laxmi Silks"
      path="/story"
      intro={`A wholesale and retail saree shop on Big Bazaar Street, in the ${STORE.address.area} cloth market of ${STORE.address.city}.`}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
        <Image
          src={ARTISAN_IMAGE}
          alt="A weaver working at a traditional loom"
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-cover"
        />
      </div>

      <h2 id="who-we-are">Who we are</h2>
      <p>
        {STORE.name} sells sarees to two kinds of customer from the same shop: people buying a
        saree for themselves, and shops, boutiques and resellers buying in quantity. What we aim for
        is in our name line: {STORE.tagline}
      </p>

      <h2 id="what-we-sell">What we sell</h2>
      <p>
        We carry {STORE.offering}. Most of the range is for everyday wear, office and gifting, at
        prices that do not need to wait for a wedding — see the{' '}
        <Link href="/budget-sarees">sarees under ₹1,000</Link>, or browse{' '}
        <Link href="/collections">every collection</Link>.
      </p>

      <h2 id="how-to-buy">How you can buy from us</h2>
      <ul>
        <li>
          <strong>In the shop</strong> — <Link href="/visit">visit us at {STORE.address.area}</Link>
          . {storeHoursLines().join('; ')}.
        </li>
        <li>
          <strong>Online</strong> — order on this website and we ship across India, with tracking
          sent by WhatsApp and SMS. Details are on the <Link href="/shipping">shipping</Link> page.
        </li>
        <li>
          <strong>Wholesale</strong> — <Link href="/wholesale">send an enquiry</Link> with your
          city and quantity and we will call back with prices.
        </li>
        <li>
          <strong>On WhatsApp</strong> —{' '}
          <a href={whatsappUrl()} target="_blank" rel="noreferrer">
            message us
          </a>{' '}
          for more photos or a video of any piece before you decide.
        </li>
      </ul>

      <h2 id="care">Caring for your sarees</h2>
      <ul>
        <li>Wash cotton, linen and khadi sarees cold, by hand, for the first few washes.</li>
        <li>Dry clean tussar and Banarasi sarees, and never wring them.</li>
        <li>Dry every saree in the shade — direct sunlight fades colour.</li>
        <li>Store sarees folded, and refold along a different line every few months.</li>
      </ul>

      <p>
        Have a question about a piece, an order or a wholesale requirement?{' '}
        <Link href="/contact">Contact us</Link> or read the{' '}
        <Link href="/faq">questions we are asked most</Link>.
      </p>
    </ProsePage>
  );
}
