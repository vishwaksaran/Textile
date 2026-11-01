import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/store/prose-page';
import { whatsappUrl } from '@/lib/config';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/authenticity') },
  title: 'How We Describe Our Sarees',
  description:
    'What the fabric names on our product pages mean — cotton, tissue, linen, khadi, semi-handloom tussar, Banarasi — and how to see a piece properly before you buy.',
};

/**
 * Kept at /authenticity because the URL is already indexed and linked.
 *
 * It used to promise Silk Mark holograms, zari grades, a card naming the
 * weaver in every box and refunds at any time — none of which matched what
 * the shop sells or its exchange policy. It now explains the words the
 * catalogue actually uses, and how to check a piece before paying.
 */
export default function AuthenticityPage() {
  return (
    <ProsePage
      eyebrow="What you are buying"
      title="How We Describe Our Sarees"
      path="/authenticity"
      intro="Plain descriptions, real photographs, and the chance to see more before you pay."
    >
      <h2 id="fabric-names">What the fabric names mean</h2>
      <ul>
        <li>
          <strong>Cotton and khadi cotton</strong> — breathable sarees for daily wear and the
          office. Khadi has a slightly textured, hand-spun feel and softens with washing.
        </li>
        <li>
          <strong>Tissue cotton</strong> — cotton with a light sheen from a metallic or lustrous
          thread in the weave.
        </li>
        <li>
          <strong>Linen</strong> — crisp, cool and light, with a natural slub.
        </li>
        <li>
          <strong>Semi-handloom tussar</strong> — tussar sarees made with a mix of handloom and
          powerloom work, which keeps them priced below fully handwoven pieces.
        </li>
        <li>
          <strong>Banarasi</strong> — sarees in the Banarasi style, with woven motifs and
          borders.
        </li>
      </ul>
      <p>
        Where a product page lists fabric, length or blouse details under Specifications, those
        are the details of that exact piece. If something you need to know is not listed, ask
        before you order.
      </p>

      <h2 id="see-before-you-buy">See it properly before you buy</h2>
      <ul>
        <li>
          <a href={whatsappUrl()} target="_blank" rel="noreferrer">
            Message us on WhatsApp
          </a>{' '}
          and we will send more photographs or a short video of the piece.
        </li>
        <li>
          Colour can look slightly different from one screen to another. If the exact shade
          matters, ask for a video in daylight.
        </li>
        <li>
          If you are in Coimbatore, <Link href="/visit">visit the shop</Link> and see the cloth in
          your hand.
        </li>
      </ul>

      <h2 id="if-something-is-wrong">If something is wrong</h2>
      <p>
        Every piece is checked before it is packed. If what arrives is defective, tell us as soon
        as you open the parcel — the full process, including the unboxing video we need, is on
        the <Link href="/returns">return and exchange policy</Link> page.
      </p>
    </ProsePage>
  );
}
