'use client';

import * as React from 'react';
import { Ruler } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';
import { useVariantStore } from '@/stores/variant-store';
import type { ProductVariant } from '@/types';

interface SizePickerProps {
  productId: string;
  variants: ProductVariant[];
  /** Shown against a size that has no price of its own. */
  basePrice: number;
  className?: string;
}

/**
 * The size chips, and the measurements behind them.
 *
 * Sold-out sizes stay on show rather than disappearing: a shopper who wanted
 * the L needs to see that the L exists and is gone, not be left wondering
 * whether this piece is simply cut short.
 */
export function SizePicker({ productId, variants, basePrice, className }: SizePickerProps) {
  const selectedId = useVariantStore((s) => s.selected[productId]) ?? null;
  const select = useVariantStore((s) => s.select);
  const [showChart, setShowChart] = React.useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? null;

  // Only worth a size table if the shop has actually filled measurements in.
  const measured = variants.filter((v) => Object.keys(v.measurements).length > 0);
  const columns = Array.from(
    new Set(measured.flatMap((v) => Object.keys(v.measurements))),
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span
          id={`size-label-${productId}`}
          className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
        >
          Size
          {selected && <span className="ml-2 text-deep-maroon">{selected.label}</span>}
        </span>

        {columns.length > 0 && (
          <button
            type="button"
            onClick={() => setShowChart((v) => !v)}
            aria-expanded={showChart}
            className="inline-flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze hover:text-deep-maroon"
          >
            <Ruler className="h-3.5 w-3.5" />
            {showChart ? 'Hide measurements' : 'Measurements'}
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={`size-label-${productId}`}
        className="flex flex-wrap gap-2"
      >
        {variants.map((variant) => {
          const soldOut = variant.stock_quantity <= 0;
          const active = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={soldOut}
              onClick={() => select(productId, active ? null : variant.id)}
              className={cn(
                'relative min-w-[3.25rem] border px-4 py-2.5 font-body-md text-sm transition-colors',
                active
                  ? 'border-deep-maroon bg-deep-maroon text-primary-fixed'
                  : 'border-outline-variant text-on-surface hover:border-deep-maroon',
                soldOut &&
                  'cursor-not-allowed border-outline-variant/50 text-on-surface-variant/50 hover:border-outline-variant/50',
              )}
            >
              {variant.label}
              {/* A line through the label, rather than removing the chip. */}
              {soldOut && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 top-1/2 h-px bg-on-surface-variant/40"
                />
              )}
              <span className="sr-only">{soldOut ? ' — sold out' : ''}</span>
            </button>
          );
        })}
      </div>

      {selected && selected.stock_quantity > 0 && selected.stock_quantity <= 3 && (
        <p className="font-body-md text-sm text-earthy-bronze">
          Only {selected.stock_quantity} left in {selected.label}.
        </p>
      )}

      {/* A size that costs more than the rest has to say so before it is in
          the cart, not after. */}
      {selected?.price != null && selected.price !== basePrice && (
        <p className="font-body-md text-sm text-on-surface-variant">
          Size {selected.label} is {formatINR(selected.price)}.
        </p>
      )}

      {showChart && columns.length > 0 && (
        <div className="overflow-x-auto border border-outline-variant/40">
          <table className="w-full min-w-[320px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                <th className="p-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Size
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="p-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {measured.map((variant) => (
                <tr key={variant.id} className={variant.id === selectedId ? 'bg-primary-container/10' : undefined}>
                  <td className="p-3 font-body-md text-sm text-on-surface">{variant.label}</td>
                  {columns.map((column) => (
                    <td key={column} className="p-3 font-body-md text-sm text-on-surface-variant">
                      {variant.measurements[column] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
