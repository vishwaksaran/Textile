import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Hero, type HeroSlide } from '@/components/store/hero';
import { ProductGrid } from '@/components/store/product-grid';
import { Reveal } from '@/components/shared/motion';
import { Button } from '@/components/ui/button';
import { getCategories, getHeroSlides, getLatestProducts } from '@/lib/data';
import { STORE } from '@/lib/config';
import { ARTISAN_IMAGE, HERO_SLIDE_IMAGES } from '@/lib/demo-data';
import { JsonLd, canonical, organizationJsonLd, searchActionJsonLd, storeJsonLd } from '@/lib/seo';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: canonical('/') },
};

const TESTIMONIALS = [
  {
    quote:
      'The Kanjeevaram arrived folded in muslin with a handwritten note naming the weaver. I have never been sent a saree that way.',
    name: 'Meera R.',
    place: 'Bengaluru',
  },
  {
    quote:
      'I wore the Banarasi to my sister’s wedding and three people asked where the zari was woven. The answer was on the card in the box.',
    name: 'Anjali S.',
    place: 'Pune',
  },
  {
    quote:
      'My mother wore khadi all her life. This is the first one I have bought that she said felt right.',
    name: 'Divya K.',
    place: 'Chennai',
  },
];

export default async function HomePage() {
  const [categories, latest, managed] = await Promise.all([
    getCategories(),
    getLatestProducts(8),
    getHeroSlides(),
  ]);

  /*
    The built-in slides, used only until the shop adds its own at
    /admin/settings/banner. Kept as a fallback rather than seeded into the
    table so an empty banner is never what a visitor lands on — a shop that
    deletes every slide gets these back instead of a blank header.
  */
  const fallback: HeroSlide[] = [
    {
      image: HERO_SLIDE_IMAGES.banarasi,
      eyebrow: STORE.tagline,
      title: 'The Regal Banarasi',
      body: 'Woven with threads of gold, a testament to centuries of royal heritage.',
      ctaLabel: 'Shop Banarasi Collection',
      ctaHref: '/category/banarasi',
    },
    {
      image: HERO_SLIDE_IMAGES.kanjeevaram,
      eyebrow: 'From the Southern Looms',
      title: 'Kanjeevaram Splendor',
      body: 'Timeless elegance from the looms of South India for your most auspicious moments.',
      ctaLabel: 'Explore Kanjeevaram',
      ctaHref: '/category/kanchipuram',
    },
    {
      image: HERO_SLIDE_IMAGES.cotton,
      eyebrow: 'Slow Fashion, Woven by Hand',
      title: 'Everyday Heritage',
      body: 'Breathable handloom cottons that bring tradition to your daily life.',
      ctaLabel: 'View Cotton Collection',
      ctaHref: '/category/khadi-cotton',
    },
  ];

  const slides: HeroSlide[] =
    managed.length > 0
      ? managed.map((row) => ({
          image: row.image_url,
          eyebrow: row.eyebrow ?? '',
          title: row.title,
          body: row.body ?? '',
          ctaLabel: row.cta_label ?? '',
          ctaHref: row.cta_href ?? '/collections',
        }))
      : fallback;

  return (
    <>
      <JsonLd data={[storeJsonLd(), organizationJsonLd(), searchActionJsonLd()]} />

      <Hero slides={slides} />

      <div className="gold-divider mx-auto max-w-container-max" />

      {/* ------------------------------------------------- featured categories */}
      <section className="container-page py-20 md:py-24" aria-labelledby="weaves-heading">
        <Reveal className="mb-14 text-center">
          <h2
            id="weaves-heading"
            className="mb-4 font-headline-lg text-headline-lg text-deep-maroon"
          >
            Heritage Weaves
          </h2>
          <p className="mx-auto max-w-lg font-body-md text-body-md text-on-surface-variant">
            Explore our curated selection of India&rsquo;s most celebrated textile traditions, each
            characterised by unique motifs and weaving techniques.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {categories.slice(0, 3).map((category, i) => (
            <Reveal key={category.id} delay={i * 0.1} className={i === 1 ? 'md:mt-12' : undefined}>
              <Link href={`/category/${category.slug}`} className="group block h-full">
                <div className="textile-card flex h-full flex-col rounded-lg bg-surface-container-lowest p-4">
                  <div className="textile-card-image-wrapper relative mb-6 aspect-[3/4] rounded bg-surface-variant/50">
                    {category.image_url && (
                      <Image
                        src={category.image_url}
                        alt={category.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        quality={90}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="mt-auto pb-2 text-center">
                    <h3 className="mb-2 font-headline-md text-headline-md text-deep-maroon">
                      {category.name}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant opacity-80 transition-opacity group-hover:opacity-100">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ latest arrivals */}
      <section
        className="border-y border-outline-variant/30 bg-surface-container-low py-20 md:py-24"
        aria-labelledby="latest-heading"
      >
        <div className="container-page">
          <Reveal className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                Fresh Off the Loom
              </p>
              <h2
                id="latest-heading"
                className="font-headline-lg text-headline-lg italic text-deep-maroon"
              >
                Latest Arrivals
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/collections">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>

          <ProductGrid products={latest} />
        </div>
      </section>

      {/* ----------------------------------------------------- artisan's journey */}
      <section className="container-page py-20 md:py-24" aria-labelledby="artisan-heading">
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <Reveal className="w-full lg:w-1/2">
            <div className="relative">
              <div className="textile-card relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src={ARTISAN_IMAGE}
                  alt="A master weaver at a traditional pit loom"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  quality={90}
                  className="object-cover"
                />
              </div>
              <div
                className="absolute -bottom-6 -right-6 -z-10 hidden h-32 w-32 rounded-full border border-primary-container/20 bg-primary-container/10 md:block"
                aria-hidden="true"
              />
            </div>
          </Reveal>

          <Reveal delay={0.15} className="w-full space-y-6 lg:w-1/2">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
              The Artisan&rsquo;s Journey
            </p>
            <h2
              id="artisan-heading"
              className="font-headline-lg text-headline-lg italic text-deep-maroon"
            >
              Slow Fashion, Woven by Hand
            </h2>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              Behind every length of fabric is an artisan whose skills have been passed down through
              generations. Our commitment to slow fashion ensures that these ancient techniques
              continue to thrive.
            </p>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              We partner directly with weaving clusters across India, providing fair wages and a
              platform for their artistry to reach an audience that appreciates true luxury — the
              luxury of time, patience, and human touch.
            </p>
            <Link
              href="/story"
              className="group inline-flex items-center gap-2 pt-2 font-label-sm text-label-sm uppercase tracking-wider text-deep-maroon transition-colors hover:text-earthy-bronze"
            >
              Read our story
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- testimonials */}
      <section
        className="border-t border-outline-variant/30 bg-surface-container-low py-20 md:py-24"
        aria-labelledby="voices-heading"
      >
        <div className="container-page">
          <Reveal className="mb-14 text-center">
            <h2
              id="voices-heading"
              className="font-headline-lg text-headline-lg text-deep-maroon"
            >
              In Their Words
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <figure className="flex h-full flex-col rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-8">
                  <span aria-hidden="true" className="mb-4 font-display-lg text-4xl leading-none text-earthy-bronze">
                    &ldquo;
                  </span>
                  <blockquote className="flex-1 font-body-md text-body-md italic leading-relaxed text-on-surface-variant">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-6 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon">
                    {t.name} · <span className="text-earthy-bronze">{t.place}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
