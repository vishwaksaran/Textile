'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Truck } from 'lucide-react';
import { ChuridarIcon, SareeIcon } from '@/components/store/garment-icons';
import { useCartStore, selectCount } from '@/stores/cart-store';
import { splitNavCategories } from '@/lib/nav';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 font-label-sm text-[10px] uppercase tracking-widest transition-colors';

/**
 * Bottom tab bar — mobile only, sits under the sticky add-to-cart bar.
 *
 * Search is deliberately not a tab. It is already an always-visible icon in
 * the mobile top bar and an item in the overlay menu, and a bar with five
 * slots is better spent on the two things people actually browse.
 *
 * The garment tab is driven by the same nav grouping as the desktop bar
 * rather than a hardcoded slug, so a shop that renames Churidars, or leads
 * with a different collection, gets the right tab without a code change.
 *
 * The garment icons are drawn in `garment-icons.tsx` rather than installed:
 * no icon set has a saree, and the only ones that ship a "sari" are emoji.
 */
export function MobileNav({ categories = [] }: { categories?: Category[] }) {
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.open);
  const count = useCartStore(selectCount);
  const hydrated = useCartStore((s) => s.hydrated);

  const { sarees, standalone } = React.useMemo(
    () => splitNavCategories(categories),
    [categories],
  );

  // Only one slot is going spare, so the first standalone collection takes it.
  const garment = standalone[0];
  const garmentHref = garment ? `/category/${garment.slug}` : null;

  // Sarees is the dropdown's own weaves plus the all-collections view, so a
  // standalone collection lights its own tab instead of both.
  const onSarees =
    pathname === '/collections' || sarees.some((c) => pathname === `/category/${c.slug}`);

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-primary-container/30 bg-warm-cream/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link
        href="/"
        aria-current={pathname === '/' ? 'page' : undefined}
        className={cn(tabClass, pathname === '/' ? 'text-deep-maroon' : 'text-on-surface-variant')}
      >
        <Home className="h-5 w-5" strokeWidth={1.5} />
        Home
      </Link>

      <Link
        href="/collections"
        aria-current={onSarees ? 'page' : undefined}
        className={cn(tabClass, onSarees ? 'text-deep-maroon' : 'text-on-surface-variant')}
      >
        <SareeIcon />
        Sarees
      </Link>

      {garmentHref && (
        <Link
          href={garmentHref}
          aria-current={pathname === garmentHref ? 'page' : undefined}
          className={cn(
            tabClass,
            pathname === garmentHref ? 'text-deep-maroon' : 'text-on-surface-variant',
          )}
        >
          <ChuridarIcon />
          {garment.name}
        </Link>
      )}

      <Link
        href="/track"
        aria-current={pathname === '/track' ? 'page' : undefined}
        className={cn(
          tabClass,
          pathname === '/track' ? 'text-deep-maroon' : 'text-on-surface-variant',
        )}
      >
        <Truck className="h-5 w-5" strokeWidth={1.5} />
        Track
      </Link>

      <button
        type="button"
        onClick={openCart}
        className={cn(tabClass, 'relative text-on-surface-variant')}
      >
        <span className="relative">
          <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
          {hydrated && count > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 text-[10px] leading-none text-deep-maroon">
              {count}
            </span>
          )}
        </span>
        Cart
      </button>
    </nav>
  );
}
