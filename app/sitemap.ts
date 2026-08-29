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
    '/privacy',
    '/track',
  ].map((path) => ({
    url: appUrl(path),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.6,
  }));

  return [
    ...staticPages,
    ...categories.map((c) => ({
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
