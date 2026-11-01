import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Hero, type HeroSlide } from '@/components/store/hero';
import { ProductGrid } from '@/components/store/product-grid';
import { Reveal } from '@/components/shared/motion';
import { Button } from '@/components/ui/button';
import { getCategories, getHeroSlides, getLatestProducts } from '@/lib/data';
import { CategoryShowcase } from '@/components/store/category-showcase';
import {
  STORE,
  marqueeNotices,
  storeAddressLines,
  storeHoursLines,
  storeMapsUrl,
  whatsappUrl,
} from '@/lib/config';
import { getPublicShippingSettings } from '@/lib/shipping-settings';
import { Marquee } from '@/components/store/marquee';
import { ARTISAN_IMAGE, HERO_SLIDE_IMAGES } from '@/lib/demo-data';
import { JsonLd, canonical, organizationJsonLd, searchActionJsonLd, storeJsonLd } from '@/lib/seo';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: canonical('/') },
};

/*
  Three questions a first-time visitor asks before anything else, answered
  on the page they land on. Deliberately not marked up as FAQPage: the full
  set, with schema, lives at /faq, and repeating the same questions in two
  places would only compete with it.
*/
const QUICK_ANSWERS: { id: string; q: string; a: React.ReactNode }[] = [
  {
    id: 'what-we-sell',
    q: 'What sarees do you sell?',
    a: (
      <>
        Cotton, <Link href="/category/tissuecotton">tissue cotton</Link>, linen,{' '}
        <Link href="/category/khadi-cotton">khadi cotton</Link>,{' '}
        <Link href="/category/semi-handloom-tussar">semi-handloom tussar</Link> and{' '}
        Banarasi sarees, plus{' '}
        <Link href="/category/churidars">churidars</Link> and dress materials. Many are{' '}
        <Link href="/budget-sarees">under ₹1,000</Link>.
      </>
    ),
  },
  {
    id: 'buy-wholesale',
    q: 'Can shops buy wholesale?',
    a: (
      <>
        Yes. We supply shops, boutiques and resellers.{' '}
        <Link href="/wholesale">Send a wholesale enquiry</Link> with your city and quantity, and
        we call back with prices.
      </>
    ),
  },
  {
    id: 'delivery',
    q: 'Do you deliver outside Coimbatore?',
    a: (
      <>
        Yes, across India. Orders are despatched within three days, with tracking by WhatsApp
        and SMS — see our <Link href="/shipping">shipping policy</Link>.
      </>
    ),
  },
];

export default async function HomePage() {
  const [categories, latest, managed, shipping] = await Promise.all([
    getCategories(),
    getLatestProducts(8),
    getHeroSlides(),
    getPublicShippingSettings(),
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
      ctaLabel: 'Shop Banarasi Sarees',
      ctaHref: '/category/banarasi',
    },
    {
      image: HERO_SLIDE_IMAGES.kanjeevaram,
      eyebrow: 'Wholesale & Retail',
      title: 'Sarees for Every Day',
      body: 'Cotton, tissue, linen and tussar sarees from Big Bazaar Street, Town Hall.',
      ctaLabel: 'Explore All Sarees',
      ctaHref: '/collections',
    },
    {
      image: HERO_SLIDE_IMAGES.cotton,
      eyebrow: 'Comfortable Cottons',
      title: 'Khadi Cotton Sarees',
      body: 'Breathable cotton sarees for daily wear and the office.',
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
          textX: row.text_x,
          textY: row.text_y,
          textAlign: row.text_align,
          showText: row.show_text,
        }))
      : fallback;

  return (
    <>
      <JsonLd data={[storeJsonLd(), organizationJsonLd(), searchActionJsonLd()]} />

      <Hero slides={slides} />

      <Marquee items={marqueeNotices(shipping.freeThreshold)} />

      <div className="gold-divider mx-auto max-w-container-max" />

      {/* ------------------------------------------------------- categories */}
      <CategoryShowcase categories={categories} />

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
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/budget-sarees">Sarees under ₹1,000</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/collections">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <ProductGrid products={latest} />
        </div>
      </section>

      {/* ------------------------------------------------------------ wholesale */}
      <section className="bg-deep-maroon py-16 md:py-20" aria-labelledby="wholesale-heading">
        <Reveal className="container-page flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-2 font-label-sm text-label-sm uppercase tracking-widest text-primary-container">
              For Shops, Boutiques &amp; Resellers
            </p>
            <h2
              id="wholesale-heading"
              className="mb-4 font-headline-lg text-headline-lg italic text-primary-fixed"
            >
              Wholesale Sarees from {STORE.address.city}
            </h2>
            <p className="font-body-md text-body-md leading-relaxed text-warm-cream/80">
              Cotton, tissue, linen, tussar and Banarasi sarees supplied to shops across India.
              Tell us what you need and we will call back with prices for your quantity.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild variant="gold" size="lg">
              <Link href="/wholesale">
                Get Wholesale Prices
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary-container text-primary-fixed hover:bg-primary-container/10"
            >
              <a
                href={whatsappUrl('Hello, I would like wholesale prices for sarees.')}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp Us
              </a>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------- about */}
      <section className="container-page py-20 md:py-24" aria-labelledby="about-heading">
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <Reveal className="w-full lg:w-1/2">
            <div className="relative">
              <div className="textile-card relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src={ARTISAN_IMAGE}
                  alt="A weaver working at a traditional loom"
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

          {/*
            The paragraph a search engine or an AI answer is most likely to
            quote when asked who this shop is — so it says who, where and
            what in its first sentence, and nothing it cannot back up.
          */}
          <Reveal delay={0.15} className="w-full space-y-6 lg:w-1/2">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
              About the Shop
            </p>
            <h2
              id="about-heading"
              className="font-headline-lg text-headline-lg italic text-deep-maroon"
            >
              Wholesale &amp; Retail Sarees in {STORE.address.area}, {STORE.address.city}
            </h2>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              {STORE.name} is a saree shop on Big Bazaar Street, {STORE.address.area},{' '}
              {STORE.address.city}, selling to retail customers and wholesale buyers alike. We
              carry {STORE.offering}.
            </p>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              Choose in person at the shop, order here online with delivery across India, or
              send a wholesale enquiry and we will quote for your quantity. If you want a closer
              look before buying, ask us on WhatsApp for more photos or a video.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
              <Link
                href="/story"
                className="group inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider text-deep-maroon transition-colors hover:text-earthy-bronze"
              >
                About us
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/collections"
                className="group inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider text-deep-maroon transition-colors hover:text-earthy-bronze"
              >
                Explore collections
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------- visit & answers */}
      <section
        className="border-t border-outline-variant/30 bg-surface-container-low py-20 md:py-24"
        aria-labelledby="visit-heading"
      >
        <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="space-y-6">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
              Visit Our Store
            </p>
            <h2
              id="visit-heading"
              className="font-headline-lg text-headline-lg italic text-deep-maroon"
            >
              Find Us at {STORE.address.area}
            </h2>
            <address className="font-body-md text-body-md not-italic leading-relaxed text-on-surface-variant">
              {storeAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {storeHoursLines().join(' · ')} · Closed on Sunday
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={storeMapsUrl()} target="_blank" rel="noreferrer">
                  <MapPin className="h-4 w-4" />
                  Get directions
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`tel:${STORE.phone.replace(/\s/g, '')}`}>
                  <Phone className="h-4 w-4" />
                  Call us
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={whatsappUrl()} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            </div>
            <div>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider text-deep-maroon transition-colors hover:text-earthy-bronze"
              >
                All contact options
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="space-y-8">
            {QUICK_ANSWERS.map(({ id, q, a }) => (
              <div key={id} className="border-l-2 border-primary-container/60 pl-5">
                <h3 id={id} className="mb-2 font-headline-md text-headline-md text-deep-maroon">
                  {q}
                </h3>
                <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant [&_a]:text-deep-maroon [&_a]:underline [&_a]:underline-offset-4">
                  {a}
                </p>
              </div>
            ))}
            <div>
              <Link
                href="/faq"
                className="group inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider text-deep-maroon transition-colors hover:text-earthy-bronze"
              >
                More questions, answered
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
