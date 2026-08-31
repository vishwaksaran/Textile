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

  // "Churidars Sarees in Coimbatore" is what an unconditional " Sarees"
  // suffix produced once a collection that is not a saree existed. The
  // section a row sits under says what it is — Kanchipuram is under Sarees,
  // 3 Piece is under Churidars — so the parent's name is the suffix, and no
  // garment is named here at all.
  const parent = category.parent_id
    ? (await getCategories()).find((c) => c.id === category.parent_id)
    : undefined;
  const noun = parent ? `${category.name} ${parent.name}` : category.name;

  // Both SEO fields are optional overrides. Empty means "keep using the
  // name", which is right for almost every collection.
  const title = category.seo_title?.trim()
    ? category.seo_title.trim()
    : `${noun} in ${STORE.address.city}`;
  const description =
    category.seo_description?.trim() ||
    category.description ||
    `Handwoven ${noun.toLowerCase()} at our ${STORE.address.area}, ${STORE.address.city} showroom, and shipped across India.`;

  return {
    alternates: { canonical: canonical(`/category/${category.slug}`) },
    title,
    description,
    openGraph: {
      title,
      description,
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
