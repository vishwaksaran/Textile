import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: canonical('/authenticity') },
  title: 'Authenticity Guarantee',
  description: 'How we verify silk purity, zari content and handloom origin.',
};

export default function AuthenticityPage() {
  return (
    <ProsePage
      eyebrow="What you are buying"
      title="Authenticity Guarantee"
      intro="Pure silk, real zari, woven on a handloom — and a way to check each of those claims yourself."
    >
      <h2>The card in the box</h2>
      <p>
        Every piece ships with a card naming the weaver, the cluster, the loom type and the date the
        piece came off the loom. It is not decorative — it is the record we keep on our side too, so
        we can answer a question about a saree years later.
      </p>

      <h2>Silk Mark</h2>
      <p>
        Pure mulberry silk pieces carry the Silk Mark hologram issued by the Silk Mark Organisation
        of India. The hologram has a serial number; it is stitched to the pallu, not glued.
      </p>

      <h2>Zari</h2>
      <ul>
        <li>
          <strong>Pure zari</strong> — silver thread with a gold wash, wound on a silk core. Heavier,
          warmer in tone, and it ages rather than flakes.
        </li>
        <li>
          <strong>Half-fine zari</strong> — a lower silver content, priced accordingly and always
          labelled as such.
        </li>
        <li>
          <strong>Tested zari</strong> — copper-based, used on lighter pieces. We say so on the
          product page whenever it is used.
        </li>
      </ul>

      <h2>How to check for yourself</h2>
      <ul>
        <li>Handloom sarees have small irregularities in the weave; powerloom output is uniform.</li>
        <li>A Kanchipuram korvai border is woven separately and interlocked — you can see the join.</li>
        <li>The reverse of a kadhwa Banarasi is clean; a cut-work brocade shows floats.</li>
      </ul>

      <h2>Our promise</h2>
      <p>
        If any piece is ever shown not to match what we described, send it back at any time — not
        just within the return window — and we will refund you in full, including what you paid to
        ship it.
      </p>
    </ProsePage>
  );
}
