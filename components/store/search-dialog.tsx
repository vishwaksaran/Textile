'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, X } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { Skeleton } from '@/components/shared/skeleton';
import { cn, effectivePrice, formatINR } from '@/lib/utils';
import type { Product } from '@/types';

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

/**
 * Search overlay. Types ahead against /api/products, and Enter always falls
 * through to the full results page so nothing is reachable only by suggestion.
 */
export function SearchDialog() {
  const open = useUiStore((s) => s.searchOpen);
  const close = useUiStore((s) => s.closeSearch);
  const router = useRouter();

  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset on every open so the overlay never shows a stale query.
  React.useEffect(() => {
    if (!open) return;
    setTerm('');
    setResults([]);
    setSearched(false);
    setHighlight(-1);
    const focus = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(focus);
  }, [open]);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Debounced type-ahead.
  React.useEffect(() => {
    const query = term.trim();
    if (query.length < MIN_CHARS) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.products ?? []);
        setSearched(true);
        setHighlight(-1);
      } catch {
        // Aborted by the next keystroke, or offline — leave the last result set.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  function goToResults() {
    const query = term.trim();
    if (!query) return;
    close();
    router.push(`/collections?q=${encodeURIComponent(query)}`);
  }

  function openProduct(product: Product) {
    close();
    router.push(`/product/${product.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && results[highlight]) openProduct(results[highlight]);
      else goToResults();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[55] bg-deep-maroon/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search the collection"
            className="fixed inset-x-0 top-0 z-[56] mx-auto max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-b-xl border-x border-b border-primary-container/30 bg-warm-cream shadow-[0_24px_60px_-20px_rgba(74,4,4,0.4)]"
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center gap-3 border-b border-outline-variant/40 px-5 py-4">
              <Search className="h-5 w-5 flex-none text-earthy-bronze" strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search sarees, weaves, colours…"
                aria-label="Search products"
                autoComplete="off"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/80 focus:outline-none focus:ring-0"
              />
              {loading && (
                <Loader2 className="h-4 w-4 flex-none animate-spin text-on-surface-variant" />
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="-mr-1 flex-none rounded p-2 text-on-surface-variant transition-colors hover:text-deep-maroon"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {term.trim().length < MIN_CHARS ? (
                <p className="px-5 py-8 text-center font-body-md text-body-md text-on-surface-variant">
                  Type at least {MIN_CHARS} letters — try &ldquo;Kanjeevaram&rdquo;, &ldquo;khadi&rdquo;
                  or &ldquo;zari&rdquo;.
                </p>
              ) : loading && results.length === 0 ? (
                <div className="space-y-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : searched && results.length === 0 ? (
                <p className="px-5 py-8 text-center font-body-md text-body-md text-on-surface-variant">
                  Nothing matches &ldquo;{term.trim()}&rdquo;. Try a weave name, or browse the full
                  catalogue.
                </p>
              ) : (
                <ul role="listbox" aria-label="Search results">
                  {results.map((product, i) => {
                    const price = effectivePrice(product);
                    const soldOut = product.is_sold_out || product.stock_quantity <= 0;
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === highlight}
                          onMouseEnter={() => setHighlight(i)}
                          onClick={() => openProduct(product)}
                          className={cn(
                            'flex w-full items-center gap-4 px-5 py-3 text-left transition-colors',
                            i === highlight ? 'bg-primary-container/15' : 'hover:bg-surface-container-low',
                          )}
                        >
                          <div className="relative h-16 w-12 flex-none overflow-hidden rounded bg-surface-variant">
                            {product.images?.[0] && (
                              <Image
                                src={product.images[0]}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-body-md text-body-md text-deep-maroon">
                              {product.name}
                            </p>
                            <p className="font-body-md text-sm text-on-surface-variant">
                              {product.categories?.name}
                              {soldOut && <span className="text-error"> · Sold out</span>}
                            </p>
                          </div>
                          <span className="flex-none font-body-md text-[16px] font-semibold tabular-nums text-deep-maroon">
                            {formatINR(price)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {term.trim().length >= MIN_CHARS && (
              <button
                type="button"
                onClick={goToResults}
                className="w-full border-t border-outline-variant/40 bg-surface-container-low px-5 py-3.5 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon transition-colors hover:bg-primary-container/15"
              >
                See all results for &ldquo;{term.trim()}&rdquo;
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
