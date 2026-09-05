import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/shared/motion';
import { buildNavTree } from '@/lib/nav';
import type { Category } from '@/types';

/**
 * Shop by category: the collections a shop keeps, as pictures rather than as
 * a menu you have to hover to discover.
 *
 * One band per section — Sarees, Churidars, whatever comes next — each showing
 * that section's own collections. Nothing here is named in code; the bands are
 * the tree, so a section added in the Category Manager appears on the home
 * page without a deploy.
 *
 * A section with no collections beneath it is left out entirely rather than
 * rendered as an empty heading, and when no section has any the whole thing
 * returns null: a band announcing "Shop by category" above a blank row is
 * worse than no band.
 */
export function CategoryShowcase({ categories }: { categories: Category[] }) {
  const groups = buildNavTree(categories).sections.filter(
    (entry) => entry.children.length > 0,
  );

  if (groups.length === 0) return null;

  return (
    <section className="container-page py-20 md:py-24" aria-labelledby="categories-heading">
      <Reveal className="mb-14 text-center">
        <h2
          id="categories-heading"
          className="mb-4 font-headline-lg text-headline-lg text-deep-maroon"
        >
          Shop by Category
        </h2>
        <p className="mx-auto max-w-lg font-body-md text-body-md text-on-surface-variant">
          Every collection we keep, from the looms of Kanchipuram to everyday cottons. Choose one
          to see what is in it.
        </p>
      </Reveal>

      <div className="space-y-16">
        {groups.map(({ section, children }) => (
          <div key={section.id}>
            <Reveal className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant/40 pb-3">
              <h3 className="font-headline-md text-headline-md text-deep-maroon">
                {section.name}
              </h3>
              <Link
                href={`/category/${section.slug}`}
                className="group inline-flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze hover:text-deep-maroon"
              >
                All {section.name.toLowerCase()}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>

            <div className="grid grid-cols-2 gap-gutter sm:grid-cols-3 lg:grid-cols-4">
              {children.map((category, i) => (
                <Reveal key={category.id} delay={Math.min(i, 5) * 0.06}>
                  <CategoryCard category={category} />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: Category }) {
  /*
    The card is 3:4 and the banner is wide, so a shop that has uploaded a
    portrait card image gets it here; everyone else keeps the banner, cropped.
  */
  const art = category.thumbnail_url || category.image_url;

  return (
    <Link href={`/category/${category.slug}`} className="group block h-full">
      <div className="textile-card flex h-full flex-col rounded-lg bg-surface-container-lowest p-3">
        <div className="textile-card-image-wrapper relative mb-4 aspect-[3/4] overflow-hidden rounded bg-surface-variant/50">
          {art ? (
            <Image
              src={art}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={85}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            /* A collection the shop has not photographed yet. The name still
               has to be reachable, so the card stays and says so quietly
               rather than showing a broken frame. */
            <span className="absolute inset-0 flex items-center justify-center px-3 text-center font-headline-md text-lg text-on-surface-variant/60">
              {category.name}
            </span>
          )}
        </div>

        <div className="mt-auto pb-1 text-center">
          <h4 className="font-headline-md text-lg text-deep-maroon">{category.name}</h4>
          {category.description && (
            <p className="mt-1 line-clamp-2 font-body-md text-sm text-on-surface-variant opacity-80 transition-opacity group-hover:opacity-100">
              {category.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
