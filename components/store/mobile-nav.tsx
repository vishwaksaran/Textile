'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Shirt, ShoppingBag, Truck } from 'lucide-react';
import { useCartStore, selectCount } from '@/stores/cart-store';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 font-label-sm text-[10px] uppercase tracking-widest transition-colors';

/** Bottom tab bar — mobile only, sits under the sticky add-to-cart bar. */
export function MobileNav() {
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.open);
  const count = useCartStore(selectCount);
  const hydrated = useCartStore((s) => s.hydrated);
  const openSearch = useUiStore((s) => s.openSearch);

  const isSarees = pathname.startsWith('/category') || pathname === '/collections';

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
        aria-current={isSarees ? 'page' : undefined}
        className={cn(tabClass, isSarees ? 'text-deep-maroon' : 'text-on-surface-variant')}
      >
        <Shirt className="h-5 w-5" strokeWidth={1.5} />
        Sarees
      </Link>

      <button type="button" onClick={openSearch} className={cn(tabClass, 'text-on-surface-variant')}>
        <Search className="h-5 w-5" strokeWidth={1.5} />
        Search
      </button>

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
