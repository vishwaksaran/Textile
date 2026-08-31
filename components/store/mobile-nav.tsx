'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CartTabIcon,
  ChuridarTabIcon,
  HomeTabIcon,
  SareeTabIcon,
  TrackTabIcon,
} from '@/components/store/tab-icons';
import { useCartStore, selectCount } from '@/stores/cart-store';
import { buildNavTree } from '@/lib/nav';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

/**
 * Bottom tab bar — mobile only, sits under the sticky add-to-cart bar.
 *
 * The active tab is shown three ways at once, because one alone is not
 * enough: the icon fills in, the label goes bold maroon, and a soft pill sits
 * behind both. Colour by itself fails for anyone who cannot separate maroon
 * from grey, so the fill carries the same information in shape.
 *
 * Search is deliberately not a tab. It is already an always-visible icon in
 * the mobile top bar and an item in the overlay menu, so the five slots go to
 * what people browse.
 *
 * The garment tab reads from the same nav grouping as the desktop bar rather
 * than a hardcoded slug, so renaming Churidars, or leading with a different
 * collection, needs no code change.
 */
export function MobileNav({ categories = [] }: { categories?: Category[] }) {
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.open);
  const count = useCartStore(selectCount);
  const hydrated = useCartStore((s) => s.hydrated);

  const { sections } = React.useMemo(() => buildNavTree(categories), [categories]);

  // Two slots for garments, so the first two sections take them — whatever
  // they are called. A shop that renames Sarees, or leads with Lehengas, gets
  // the right tabs without a code change.
  const [primary, secondary] = sections;
  const hrefFor = (s?: (typeof sections)[number]) =>
    s ? `/category/${s.section.slug}` : null;
  const primaryHref = hrefFor(primary);
  const secondaryHref = hrefFor(secondary);

  const covers = (entry: (typeof sections)[number] | undefined) =>
    entry !== undefined &&
    (pathname === `/category/${entry.section.slug}` ||
      entry.children.some((c) => pathname === `/category/${c.slug}`));

  const onHome = pathname === '/';
  const onTrack = pathname === '/track';

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-primary-container/30 bg-warm-cream/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Tab href="/" active={onHome} label="Home">
        <HomeTabIcon filled={onHome} />
      </Tab>

      {primaryHref && (
        <Tab href={primaryHref} active={covers(primary)} label={primary.section.name}>
          <SareeTabIcon filled={covers(primary)} />
        </Tab>
      )}

      {secondaryHref && (
        <Tab href={secondaryHref} active={covers(secondary)} label={secondary.section.name}>
          <ChuridarTabIcon filled={covers(secondary)} />
        </Tab>
      )}

      <Tab href="/track" active={onTrack} label="Track">
        <TrackTabIcon filled={onTrack} />
      </Tab>

      {/* The cart opens a drawer rather than navigating, so it is a button and
          never takes the active state. */}
      <Tab as="button" onClick={openCart} active={false} label="Cart">
        <span className="relative">
          <CartTabIcon />
          {hydrated && count > 0 && (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 text-[10px] leading-none text-deep-maroon">
              {count}
            </span>
          )}
        </span>
      </Tab>
    </nav>
  );
}

/**
 * One tab. The pill is drawn on an inner span rather than the link itself, so
 * the tap target stays the full height of the bar while the highlight stays
 * the size of the content.
 */
function Tab({
  as = 'link',
  href,
  onClick,
  active,
  label,
  children,
}: {
  as?: 'link' | 'button';
  href?: string;
  onClick?: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const inner = (
    <span
      className={cn(
        'flex flex-col items-center gap-1 rounded-full px-3 py-1 transition-colors',
        active && 'bg-primary-container/20',
      )}
    >
      {children}
      <span
        className={cn(
          'font-label-sm text-[10px] uppercase tracking-widest',
          active && 'font-bold',
        )}
      >
        {label}
      </span>
    </span>
  );

  const className = cn(
    'flex flex-1 items-center justify-center py-2 transition-colors',
    active ? 'text-deep-maroon' : 'text-on-surface-variant',
  );

  if (as === 'button') {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href!} aria-current={active ? 'page' : undefined} className={className}>
      {inner}
    </Link>
  );
}
