import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/store/logo';
import { STORE, whatsappUrl } from '@/lib/config';
import { getCategories, getProducts } from '@/lib/data';

/*
  Its own title, not the home page's: a shared link to a dead page otherwise
  previews as the shop's front page, and the browser tab says nothing is
  wrong. Next adds noindex to every 404 by itself.
*/
export const metadata: Metadata = {
  title: 'Page not found',
};

/*
  A dead link is usually a sold-out piece or an old collection, so the useful
  answer is the collections that do have stock — each one a step closer than
  "back to home". Built once with the site and refreshed with it, so a 404
  costs no server time.
*/
export default async function NotFound() {
  const categories = await getCategories();
  const counts = await Promise.all(
    categories.map((c) => getProducts({ categorySlug: c.slug, limit: 1 })),
  );
  const stocked = categories.filter((_, i) => counts[i].total > 0).slice(0, 6);

  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-margin-mobile py-16 text-center"
    >
      <Link href="/" aria-label={`${STORE.name} home`}>
        <LogoMark className="h-14 text-deep-maroon" />
      </Link>
      <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
        404 — nothing on this loom
      </p>
      <h1 className="max-w-lg font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[44px]">
        This page has come off the thread
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        The piece may have sold out, or the link may be old. Everything currently in the shop is
        one click away.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" shine>
          <Link href="/collections">Browse all collections</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to {STORE.name}</Link>
        </Button>
      </div>

      {stocked.length > 0 && (
        <nav aria-labelledby="nf-collections" className="mt-4 w-full max-w-xl">
          <h2
            id="nf-collections"
            className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze"
          >
            In the shop now
          </h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {stocked.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-outline-variant px-4 font-body-md text-sm text-deep-maroon transition-colors hover:border-deep-maroon hover:bg-deep-maroon/5"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/budget-sarees"
                className="inline-flex min-h-[44px] items-center rounded-full border border-outline-variant px-4 font-body-md text-sm text-deep-maroon transition-colors hover:border-deep-maroon hover:bg-deep-maroon/5"
              >
                Under ₹1,000
              </Link>
            </li>
          </ul>
        </nav>
      )}

      <div className="mt-2 flex flex-col items-center gap-3 font-body-md text-sm text-on-surface-variant sm:flex-row sm:gap-6">
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-deep-maroon underline underline-offset-4"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search the collections
        </Link>
        <a
          href={whatsappUrl('Hello, I was looking for a piece on your website and could not find it.')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-deep-maroon underline underline-offset-4"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Looking for a particular piece? WhatsApp {STORE.phone}
        </a>
      </div>
    </main>
  );
}
