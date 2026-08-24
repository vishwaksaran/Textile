import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingView } from '@/components/store/listing-view';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { ProductGridSkeleton } from '@/components/shared/skeleton';
import { getCategories, getCategoryBySlug } from '@/lib/data';

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
  return {
    title: category.name,
    description: category.description ?? undefined,
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
        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg md:min-h-[360px]">
          {category.image_url && (
            <Image
              src={category.image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-deep-maroon/25" aria-hidden="true" />
          <div className="relative mx-6 max-w-2xl bg-warm-cream/90 px-6 py-8 text-center backdrop-blur-sm md:px-12 md:py-12">
            <h1 className="mb-4 font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[48px]">
              {category.name}
            </h1>
            {category.description && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                {category.description}
              </p>
            )}
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
