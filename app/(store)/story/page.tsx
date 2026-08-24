import Image from 'next/image';
import type { Metadata } from 'next';
import { ProsePage } from '@/components/store/prose-page';
import { ARTISAN_IMAGE } from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    'How Sri Laxmi Silks works with weaving clusters across India — fair wages, named weavers, and slow fashion.',
};

export default function StoryPage() {
  return (
    <ProsePage
      eyebrow="The Artisan's Journey"
      title="Slow Fashion, Woven by Hand"
      intro="We are a family store on Cross Cut Road in Coimbatore, and we buy the way our grandparents did — from the loom, from people we know by name."
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
        <Image
          src={ARTISAN_IMAGE}
          alt="A weaver at a traditional pit loom"
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-cover"
        />
      </div>

      <h2>Where the cloth comes from</h2>
      <p>
        Every piece in this store was made on a handloom. We work directly with weaving clusters in
        Kanchipuram, Varanasi, Chanderi and Paithan — no agents, no middlemen adding a margin
        without adding a skill.
      </p>
      <p>
        A single Kanjeevaram saree takes between ten and twenty-five days on the loom, depending on
        the density of the zari. That number is why we cannot restock quickly, and why a piece that
        sells out sometimes stays sold out for a month.
      </p>

      <h2>What fair means here</h2>
      <ul>
        <li>Weavers are paid per piece at a rate agreed before work begins, and paid on delivery.</li>
        <li>We buy the whole run, not only the best pieces, so nobody carries our risk for us.</li>
        <li>Each saree ships with a card naming the weaver and the cluster it came from.</li>
      </ul>

      <h2>Why some things cost what they do</h2>
      <p>
        Pure zari is silver thread dipped in gold. Mulberry silk is graded and priced by weight. A
        heavier saree costs more because there is more of it — not because of a brand name. When we
        discount a piece, it is because we over-bought, never because the weaver was paid less.
      </p>

      <h2>Caring for handloom</h2>
      <ul>
        <li>Dry clean silk. Never wring it, and never dry it in direct sunlight.</li>
        <li>Store sarees folded in muslin, refolded along a different line every few months.</li>
        <li>Wash khadi cold by hand for the first three washes; it will soften and shrink slightly.</li>
      </ul>

      <p>
        If you have a question about a specific piece — its weight, its origin, whether it will suit
        a particular occasion — write to us. We have handled every saree in this catalogue.
      </p>
    </ProsePage>
  );
}
