import { getCategories, getProducts } from '@/lib/data';
import {
  STORE,
  appUrl,
  storeAddressOneLine,
  storeHoursLines,
} from '@/lib/config';

/**
 * /llms.txt — a plain-text summary of the shop for AI assistants.
 *
 * Not a Google ranking signal; it exists so an assistant asked "where can I
 * buy cotton sarees in Coimbatore" finds the facts in one place instead of
 * piecing them together from navigation menus. Built from the same STORE
 * config and live categories as the rest of the site, so it cannot drift from
 * what the pages say.
 *
 * Cached for an hour and cleared by revalidateCatalogue() on admin edits, so
 * serving it costs no server time on an ordinary request.
 */
export const revalidate = 3600;

export async function GET() {
  const categories = await getCategories();

  // Same rule as the sitemap: only collections that have something in them.
  const counts = await Promise.all(
    categories.map((c) => getProducts({ categorySlug: c.slug, limit: 1 })),
  );
  const stocked = categories.filter((_, i) => counts[i].total > 0);

  const link = (name: string, path: string, note?: string) =>
    `- [${name}](${appUrl(path)})${note ? `: ${note}` : ''}`;

  const body = [
    `# ${STORE.name}`,
    '',
    `> Wholesale and retail saree shop on Big Bazaar Street, ${STORE.address.area}, ${STORE.address.city}, India. Sells ${STORE.offering}. Buy in store, order online with delivery across India, or ask for wholesale prices.`,
    '',
    `- Address: ${storeAddressOneLine()}`,
    `- Hours: ${storeHoursLines().join(', ')}; closed on Sunday`,
    `- Phone and WhatsApp: ${STORE.phone}`,
    `- Email: ${STORE.email}`,
    `- GSTIN: ${STORE.gstin}`,
    '',
    '## Shop',
    '',
    link('All collections', '/collections'),
    ...stocked.map((c) =>
      link(c.name, `/category/${c.slug}`, c.description?.trim() || undefined),
    ),
    link('Sarees under ₹1,000', '/budget-sarees'),
    link('Wholesale enquiries', '/wholesale', 'for shops, boutiques and resellers'),
    '',
    '## Visiting and buying',
    '',
    link('Visit the shop', '/visit', 'address, hours and directions'),
    link('Contact', '/contact'),
    link('Questions answered', '/faq'),
    link('Shipping policy', '/shipping', 'despatch within 3 days, delivery across India'),
    link('Return and exchange policy', '/returns', 'exchanges for defective pieces only, at the shop'),
    link('How we describe our sarees', '/authenticity'),
    link('About us', '/story'),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
