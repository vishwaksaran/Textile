import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingView } from '@/components/store/listing-view';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { ProductGridSkeleton } from '@/components/shared/skeleton';
import { getCategories, getCategoryBySlug } from '@/lib/data';
import { JsonLd, breadcrumbJsonLd, canonical } from '@/lib/seo';
import { STORE } from '@/lib/config';

export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: 'Collection not found' };
  // "Churidars Sarees in Coimbatore" is what the old unconditional suffix
  // produced once a collection that is not a saree existed. A weave still
  // wants the word — it is what people search — so it is appended only where
  // it is true, which the nav grouping already records.
  const isSarees = (category.nav_group ?? 'sarees') === 'sarees';
  const title = isSarees
    ? `${category.name} Sarees in ${STORE.address.city}`
    : `${category.name} in ${STORE.address.city}`;

  return {
    alternates: { canonical: canonical(`/category/${category.slug}`) },
    title,
    description:
      category.description ??
      `Handwoven ${category.name}${isSarees ? ' sarees' : ''} at our ${STORE.address.area}, ${STORE.address.city} showroom, and shipped across India.`,
    openGraph: {
      title: isSarees ? `${category.name} Sarees` : category.name,
      description: category.description ?? undefined,
      images: category.image_url ? [category.image_url] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/collections' },
          { name: category.name, path: `/category/${category.slug}` },
        ])}
      />

      <div className="container-page pt-6">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Collections', href: '/collections' },
            { label: category.name },
          ]}
        />
      </div>

      <header className="container-page pt-6">
        <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-lg md:min-h-[440px]">
          {category.image_url ? (
            <>
              <Image
                src={category.image_url}
                alt=""
                fill
                priority
                sizes="100vw"
                quality={90}
                className="object-cover"
              />
              {/* Weighted to the bottom, where the text sits, so the image is
                  still visible at the top. A flat wash over the whole frame
                  dulls the cloth, which is the thing being sold. */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-deep-maroon via-deep-maroon/70 to-deep-maroon/25"
                aria-hidden="true"
              />
            </>
          ) : (
            // No cover image yet — a flat maroon field rather than a washed-out
            // placeholder, so the page still looks deliberate.
            <div className="absolute inset-0 bg-deep-maroon" aria-hidden="true" />
          )}

          <div className="relative mx-auto max-w-3xl px-6 py-12 text-center md:px-12">
            <h1 className="font-display-lg text-[34px] leading-tight text-warm-cream drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] md:text-[52px]">
              {category.name}
            </h1>
            {category.description && (
              <p className="mx-auto mt-4 max-w-2xl font-body-lg text-body-md text-warm-cream/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] md:text-body-lg">
                {category.description}
              </p>
            )}
            <span
              aria-hidden="true"
              className="mx-auto mt-8 block h-px w-24 bg-gradient-to-r from-transparent via-primary-container to-transparent"
            />
          </div>
        </div>
      </header>

      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={
          <div className="container-page py-10">
            <ProductGridSkeleton />
          </div>
        }
      >
        <ListingView searchParams={searchParams} lockedCategory={category} />
      </Suspense>
    </>
  );
}
