import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingView } from '@/components/store/listing-view';
import { CategoryHero } from '@/components/store/category-hero';
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

      {/* Full-bleed: the breadcrumb moves inside the header rather than
          sitting in a container above it, so nothing interrupts the image
          between the nav bar and the grid. */}
      <CategoryHero
        name={category.name}
        description={category.description}
        imageUrl={category.image_url}
      />

      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={
          <div className="container-page py-10">
            <ProductGridSkeleton />
          </div>
        }
      >
        {/* The hero owns the LCP on this route, so nothing in the grid
            competes with it for the first bytes. */}
        <ListingView searchParams={searchParams} lockedCategory={category} priorityCount={0} />
      </Suspense>
    </>
  );
}
