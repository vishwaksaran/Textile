'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu, Package, Search, Sparkles, X } from 'lucide-react';
import { STORE } from '@/lib/config';
import { buildNavTree } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/store/logo';
import { CartButton } from '@/components/store/cart-button';
import { useUiStore } from '@/stores/ui-store';
import type { Category } from '@/types';

export const TRENDING_HREF = '/collections?sort=newest';

const navItemClass =
  'flex items-center gap-1.5 border-b-2 pb-1 font-label-lg text-label-lg uppercase transition-colors';

export function Navbar({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const openSearch = useUiStore((s) => s.openSearch);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A route change should never leave the overlay menu behind.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const { sections } = React.useMemo(() => buildNavTree(categories), [categories]);

  /**
   * A section is current when its own page is open or one of its children is.
   * Checked per section rather than globally so two items are never lit at
   * once — the bug the old single "onSarees" flag would produce the moment a
   * second section existed.
   */
  const isCurrent = React.useCallback(
    ({ section, children }: (typeof sections)[number]) =>
      pathname === `/category/${section.slug}` ||
      children.some((c) => pathname === `/category/${c.slug}`),
    [pathname],
  );

  return (
    <>
      {/* ------------------------------------------------------------ desktop */}
      <header
        className={cn(
          'sticky top-0 z-40 hidden w-full border-b border-primary-container/30 bg-warm-cream/90 backdrop-blur-md transition-shadow md:block',
          scrolled && 'shadow-[0_4px_20px_-5px_rgba(74,4,4,0.06)]',
        )}
      >
        <div className="container-page flex h-24 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex flex-none items-center gap-3 text-deep-maroon transition-opacity duration-300 hover:opacity-80"
          >
            <LogoMark className="h-11" priority />
            <span className="font-display-lg text-headline-lg uppercase tracking-wider">
              {STORE.name}
            </span>
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-7">
            {/* One item per top-level category. A section with children gets
                a dropdown; one without is a plain link, so a new section
                needs no code either way. */}
            {sections.map((entry) =>
              entry.children.length > 0 ? (
                <SectionMenu
                  key={entry.section.id}
                  section={entry.section}
                  categories={entry.children}
                  active={isCurrent(entry)}
                />
              ) : (
                <Link
                  key={entry.section.id}
                  href={`/category/${entry.section.slug}`}
                  aria-current={isCurrent(entry) ? 'page' : undefined}
                  className={cn(
                    navItemClass,
                    isCurrent(entry)
                      ? 'border-primary-container font-bold text-deep-maroon'
                      : 'border-transparent text-on-surface-variant hover:text-deep-maroon',
                  )}
                >
                  {entry.section.name}
                </Link>
              ),
            )}

            <button
              type="button"
              onClick={openSearch}
              className={cn(navItemClass, 'border-transparent text-on-surface-variant hover:text-deep-maroon')}
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
              Search
            </button>

            <Link
              href={TRENDING_HREF}
              className={cn(navItemClass, 'border-transparent text-on-surface-variant hover:text-deep-maroon')}
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              New &amp; Trending
            </Link>

            <CartButton showLabel className={cn(navItemClass, 'border-transparent')} />

            <Link
              href="/track"
              aria-current={pathname === '/track' ? 'page' : undefined}
              className={cn(
                navItemClass,
                pathname === '/track'
                  ? 'border-primary-container font-bold text-deep-maroon'
                  : 'border-transparent text-on-surface-variant hover:text-deep-maroon',
              )}
            >
              <Package className="h-4 w-4" strokeWidth={1.5} />
              Track
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------- mobile */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-primary-container/30 bg-warm-cream/90 px-margin-mobile backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="-ml-2 rounded p-2 text-deep-maroon"
        >
          <Menu className="h-6 w-6" strokeWidth={1.5} />
        </button>

        <Link href="/" className="flex items-center gap-2 text-deep-maroon">
          <LogoMark className="h-7" />
          <span className="font-display-lg text-[15px] uppercase tracking-wider">{STORE.name}</span>
        </Link>

        <div className="-mr-2 flex items-center">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="rounded p-2 text-deep-maroon"
          >
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <CartButton />
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-warm-cream md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="sticky top-0 flex h-16 items-center justify-between bg-warm-cream px-margin-mobile">
              <span className="font-display-lg text-headline-md uppercase tracking-wider text-deep-maroon">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="-mr-2 rounded p-2 text-deep-maroon"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="px-margin-mobile pb-16 pt-4" aria-label="Mobile">
              {sections.map((entry) =>
                entry.children.length > 0 ? (
                  <MobileSection
                    key={entry.section.id}
                    section={entry.section}
                    categories={entry.children}
                  />
                ) : (
                  <Link
                    key={entry.section.id}
                    href={`/category/${entry.section.slug}`}
                    className="flex items-center justify-between border-b border-outline-variant/40 py-4 font-headline-md text-headline-md text-deep-maroon"
                  >
                    {entry.section.name}
                  </Link>
                ),
              )}

              <ul className="mt-2 space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      openSearch();
                    }}
                    className="flex w-full items-center gap-3 border-b border-outline-variant/40 py-4 font-headline-md text-headline-md text-deep-maroon"
                  >
                    <Search className="h-5 w-5" strokeWidth={1.5} />
                    Search
                  </button>
                </li>
                <li>
                  <Link
                    href={TRENDING_HREF}
                    className="flex items-center gap-3 border-b border-outline-variant/40 py-4 font-headline-md text-headline-md text-deep-maroon"
                  >
                    <Sparkles className="h-5 w-5" strokeWidth={1.5} />
                    New &amp; Trending
                  </Link>
                </li>
                <li>
                  <Link
                    href="/track"
                    className="flex items-center gap-3 border-b border-outline-variant/40 py-4 font-headline-md text-headline-md text-deep-maroon"
                  >
                    <Package className="h-5 w-5" strokeWidth={1.5} />
                    Track Order
                  </Link>
                </li>
              </ul>

              <div className="mt-10 space-y-3">
                <Link
                  href="/story"
                  className="block font-label-lg text-label-lg uppercase text-on-surface-variant"
                >
                  Our story
                </Link>
                <Link
                  href="/contact"
                  className="block font-label-lg text-label-lg uppercase text-on-surface-variant"
                >
                  Contact
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * "Sarees" with its weave submenu. Opens on hover for pointers and on
 * click/Enter for keyboards, and closes on Escape or focus leaving the group.
 */
function SectionMenu({
  section,
  categories,
  active,
}: {
  section: Category;
  categories: Category[];
  active: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => () => clearTimeout(closeTimer.current), []);

  // A small delay stops the menu snapping shut while crossing the gap to it.
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);

  return (
    <div
      ref={groupRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onBlur={(e) => {
        if (!groupRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          navItemClass,
          active
            ? 'border-primary-container font-bold text-deep-maroon'
            : 'border-transparent text-on-surface-variant hover:text-deep-maroon',
        )}
      >
        {section.name}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4"
          >
            <div className="overflow-hidden rounded-lg border border-primary-container/30 bg-warm-cream py-2 shadow-[0_16px_40px_-16px_rgba(74,4,4,0.35)]">
              <p className="px-4 pb-2 pt-1 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                By weave
              </p>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 font-body-md text-body-md text-on-surface transition-colors hover:bg-primary-container/15 hover:text-deep-maroon"
                >
                  {category.name}
                </Link>
              ))}
              <div className="my-2 h-px bg-outline-variant/40" />
              <Link
                href={`/category/${section.slug}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon transition-colors hover:bg-primary-container/15"
              >
                All {section.name}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The same submenu on mobile, as an expandable section. */
function MobileSection({ section, categories }: { section: Category; categories: Category[] }) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="border-b border-outline-variant/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 font-headline-md text-headline-md text-deep-maroon"
      >
        {section.name}
        <ChevronDown
          className={cn('h-5 w-5 transition-transform', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {categories.map((category, i) => (
              <motion.li
                key={category.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.25 }}
              >
                <Link
                  href={`/category/${category.slug}`}
                  className="block py-3 pl-4 font-body-lg text-body-lg text-on-surface-variant"
                >
                  {category.name}
                </Link>
              </motion.li>
            ))}
            <li>
              <Link
                href={`/category/${section.slug}`}
                className="block py-3 pb-5 pl-4 font-label-lg text-label-lg uppercase text-deep-maroon"
              >
                All {section.name}
              </Link>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
