import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/data';
import { appUrl } from '@/lib/config';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, { products }] = await Promise.all([
    getCategories(),
    getProducts({ limit: 500 }),
  ]);

  const staticPages = [
    '',
    '/collections',
    '/story',
    '/contact',
    '/shipping',
    '/returns',
    '/authenticity',
    '/faq',
    '/visit',
    '/wholesale',
    '/budget-sarees',
    '/privacy',
    '/track',
  ].map((path) => ({
    // No lastModified: stamping every static page with the build time tells
    // Google they all changed on every regeneration, which teaches it to
    // ignore the field — including on products, where it is real.
    url: appUrl(path),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.6,
  }));

  /*
    Only collections with something in them. An empty one is marked noindex
    on its own page, and listing it here as well would be asking Google to
    crawl a page while telling it not to keep it.
  */
  const counts = await Promise.all(
    categories.map((c) => getProducts({ categorySlug: c.slug, limit: 1 })),
  );
  const stocked = categories.filter((_, i) => counts[i].total > 0);

  return [
    ...staticPages,
    ...stocked.map((c) => ({
      url: appUrl(`/category/${c.slug}`),
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: appUrl(`/product/${p.id}`),
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
