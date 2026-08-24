'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PRICE_BANDS, SORT_OPTIONS } from '@/lib/filters';

interface FilterPanelProps {
  categories: { id: string; name: string; slug: string }[];
  activeCategory?: string;
  total: number;
}

/**
 * Filters live in the URL, so the server component re-renders with real data
 * and every filtered view is linkable and back-button friendly.
 */
export function FilterPanel({ categories, activeCategory, total }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const band = params.get('band');
  const inStock = params.get('in_stock') === '1';
  const discounted = params.get('discounted') === '1';
  const sort = params.get('sort') ?? 'featured';

  const update = React.useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      next.delete('page'); // any filter change resets pagination
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const activeCount =
    (band ? 1 : 0) + (inStock ? 1 : 0) + (discounted ? 1 : 0) + (activeCategory ? 0 : 0);

  const body = (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-deep-maroon">Refine</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => update((n) => ['band', 'in_stock', 'discounted'].forEach((k) => n.delete(k)))}
            className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze hover:text-deep-maroon"
          >
            Clear all
          </button>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          Price range
        </legend>
        {PRICE_BANDS.map((b, i) => {
          const value = String(i);
          const checked = band === value;
          return (
            <label key={b.label} className="flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="band"
                checked={checked}
                onChange={() =>
                  update((n) => (checked ? n.delete('band') : n.set('band', value)))
                }
                onClick={() => checked && update((n) => n.delete('band'))}
                className="h-4 w-4 border-outline-variant text-deep-maroon focus:ring-primary-container"
              />
              <span className="font-body-md text-sm text-on-surface">{b.label}</span>
            </label>
          );
        })}
      </fieldset>

      {categories.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
            Weave
          </legend>
          {categories.map((c) => {
            const checked = activeCategory === c.slug;
            return (
              <label key={c.id} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    update((n) => (checked ? n.delete('category') : n.set('category', c.slug)))
                  }
                  className="h-4 w-4 rounded-none border-outline-variant text-deep-maroon focus:ring-primary-container"
                />
                <span className="font-body-md text-sm text-on-surface">{c.name}</span>
              </label>
            );
          })}
        </fieldset>
      )}

      <fieldset className="space-y-4 border-t border-outline-variant/40 pt-6">
        <Toggle
          label="In stock only"
          checked={inStock}
          onChange={(v) => update((n) => (v ? n.set('in_stock', '1') : n.delete('in_stock')))}
        />
        <Toggle
          label="Show only discounted"
          checked={discounted}
          onChange={(v) => update((n) => (v ? n.set('discounted', '1') : n.delete('discounted')))}
        />
      </fieldset>
    </div>
  );

  return (
    <>
      {/* -------------------------------------------------------- desktop rail */}
      <aside
        className={cn(
          'hidden h-fit rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6 lg:sticky lg:top-28 lg:block',
          pending && 'opacity-60 transition-opacity',
        )}
        aria-label="Product filters"
      >
        {body}
      </aside>

      {/* ------------------------------------------------------- mobile trigger */}
      <div className="flex items-center justify-between gap-4 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
        <SortSelect
          value={sort}
          onChange={(value) => update((n) => n.set('sort', value))}
          className="max-w-[190px]"
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-warm-cream lg:hidden">
          <div className="flex items-center justify-between border-b border-outline-variant/40 px-margin-mobile py-4">
            <span className="font-headline-md text-headline-md text-deep-maroon">Filters</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close filters"
              className="-mr-2 rounded p-2 text-deep-maroon"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-margin-mobile py-6">{body}</div>
          <div className="border-t border-outline-variant/40 px-margin-mobile py-4">
            <Button className="w-full" onClick={() => setMobileOpen(false)}>
              Show {total} {total === 1 ? 'piece' : 'pieces'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="font-body-md text-sm text-on-surface">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 flex-none rounded-full transition-colors',
          checked ? 'bg-deep-maroon' : 'bg-surface-variant',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-warm-cream shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label
        htmlFor="sort"
        className="hidden font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant sm:block"
      >
        Sort by
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm text-on-surface focus:border-deep-maroon focus:outline-none focus:ring-0"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Wrapper so the desktop sort control shares the URL-writing behaviour. */
export function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get('sort') ?? 'featured';

  return (
    <SortSelect
      value={value}
      onChange={(next) => {
        const p = new URLSearchParams(params.toString());
        p.set('sort', next);
        p.delete('page');
        router.push(`${pathname}?${p.toString()}`, { scroll: false });
      }}
    />
  );
}
