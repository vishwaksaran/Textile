'use client';

import * as React from 'react';
import { Ruler } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';
import { optionKey } from '@/lib/variant-key';
import { useSelectedOptions, useVariantStore } from '@/stores/variant-store';
import type { OptionDetail, ProductVariant } from '@/types';

export interface VariantAxis {
  slug: string;
  name: string;
  /** Values this product actually stocks, in the shop's order. */
  values: string[];
}

interface VariantPickerProps {
  productId: string;
  axes: VariantAxis[];
  variants: ProductVariant[];
  optionDetails: Record<string, OptionDetail>;
  /** Shown against a combination priced the same as the product. */
  basePrice: number;
  className?: string;
}

/**
 * One row of chips per axis — Colour, then Size — and the measurements behind
 * them.
 *
 * Nothing here names an axis. A shop that decides sarees vary by border
 * colour ticks a box in the Category Manager and this renders it, which is
 * the whole reason the axes are attributes rather than columns.
 *
 * Values that cannot be reached stay on show rather than disappearing: a
 * shopper who wanted the L needs to see that the L exists and is gone, not be
 * left wondering whether the piece is simply cut short.
 */
export function VariantPicker({
  productId,
  axes,
  variants,
  optionDetails,
  basePrice,
  className,
}: VariantPickerProps) {
  const selected = useSelectedOptions(productId);
  const select = useVariantStore((s) => s.select);
  const [showChart, setShowChart] = React.useState(false);

  const inStock = React.useMemo(
    () => variants.filter((v) => v.is_active && v.stock_quantity > 0),
    [variants],
  );

  /**
   * Whether a value is still reachable given everything else chosen.
   *
   * Its own axis is excluded from the test, so clicking a sold-out colour
   * does not require first clearing the size — the shopper is asking "what
   * about this one instead", and the answer has to be about the colour.
   */
  const reachable = React.useCallback(
    (slug: string, value: string) =>
      inStock.some(
        (variant) =>
          variant.options[slug] === value &&
          axes.every(
            (axis) =>
              axis.slug === slug ||
              !selected[axis.slug] ||
              variant.options[axis.slug] === selected[axis.slug],
          ),
      ),
    [inStock, axes, selected],
  );

  const complete = axes.every((axis) => selected[axis.slug]);
  const chosen = complete
    ? (variants.find(
        (v) =>
          v.option_key ===
          optionKey(Object.fromEntries(axes.map((a) => [a.slug, selected[a.slug]]))),
      ) ?? null)
    : null;

  /*
    A size chart is worth showing when the shop has filled measurements in
    against the values of one axis. Which axis is not assumed: whichever one
    carries figures gets the table.
  */
  const measuredAxis = axes.find((axis) =>
    axis.values.some(
      (value) => Object.keys(optionDetails[`${axis.slug}:${value}`]?.measurements ?? {}).length > 0,
    ),
  );

  const measurementColumns = measuredAxis
    ? Array.from(
        new Set(
          measuredAxis.values.flatMap((value) =>
            Object.keys(optionDetails[`${measuredAxis.slug}:${value}`]?.measurements ?? {}),
          ),
        ),
      )
    : [];

  return (
    <div className={cn('space-y-6', className)}>
      {axes.map((axis) => (
        <div key={axis.slug} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span
              id={`axis-${productId}-${axis.slug}`}
              className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
            >
              {axis.name}
              {selected[axis.slug] && (
                <span className="ml-2 text-deep-maroon">{selected[axis.slug]}</span>
              )}
            </span>

            {measuredAxis?.slug === axis.slug && measurementColumns.length > 0 && (
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
            aria-labelledby={`axis-${productId}-${axis.slug}`}
            className="flex flex-wrap gap-2"
          >
            {axis.values.map((value) => {
              const active = selected[axis.slug] === value;
              const available = reachable(axis.slug, value);
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!available && !active}
                  onClick={() => select(productId, axis.slug, active ? null : value)}
                  className={cn(
                    'relative min-w-[3.25rem] border px-4 py-2.5 font-body-md text-sm transition-colors',
                    active
                      ? 'border-deep-maroon bg-deep-maroon text-primary-fixed'
                      : 'border-outline-variant text-on-surface hover:border-deep-maroon',
                    !available &&
                      !active &&
                      'cursor-not-allowed border-outline-variant/50 text-on-surface-variant/50 hover:border-outline-variant/50',
                  )}
                >
                  {value}
                  {/* A line through the label, rather than removing the chip. */}
                  {!available && !active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-2 top-1/2 h-px bg-on-surface-variant/40"
                    />
                  )}
                  <span className="sr-only">{available ? '' : ' — unavailable'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {chosen && chosen.stock_quantity > 0 && chosen.stock_quantity <= 3 && (
        <p className="font-body-md text-sm text-earthy-bronze">
          Only {chosen.stock_quantity} left in {chosen.label}.
        </p>
      )}

      {/* A combination that costs more than the rest has to say so before it
          is in the cart, not after. */}
      {chosen?.price != null && chosen.price !== basePrice && (
        <p className="font-body-md text-sm text-on-surface-variant">
          {chosen.label} is {formatINR(chosen.price)}.
        </p>
      )}

      {showChart && measuredAxis && measurementColumns.length > 0 && (
        <div className="overflow-x-auto border border-outline-variant/40">
          <table className="w-full min-w-[320px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                <th className="p-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  {measuredAxis.name}
                </th>
                {measurementColumns.map((column) => (
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
              {measuredAxis.values.map((value) => {
                const measurements =
                  optionDetails[`${measuredAxis.slug}:${value}`]?.measurements ?? {};
                if (Object.keys(measurements).length === 0) return null;
                return (
                  <tr
                    key={value}
                    className={
                      selected[measuredAxis.slug] === value
                        ? 'bg-primary-container/10'
                        : undefined
                    }
                  >
                    <td className="p-3 font-body-md text-sm text-on-surface">{value}</td>
                    {measurementColumns.map((column) => (
                      <td
                        key={column}
                        className="p-3 font-body-md text-sm text-on-surface-variant"
                      >
                        {measurements[column] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The axes a product actually offers, built from its variants.
 *
 * Derived rather than taken from the category, so a churidar entered in green
 * and red only ever offers green and red — never the whole colour list with
 * fourteen of them struck through.
 */
export function axesForProduct(
  variants: ProductVariant[],
  definitions: { slug: string; name: string }[],
): VariantAxis[] {
  return definitions
    .map(({ slug, name }) => ({
      slug,
      name,
      values: [
        ...new Set(
          variants
            .map((v) => v.options[slug])
            .filter((value): value is string => Boolean(value)),
        ),
      ],
    }))
    .filter((axis) => axis.values.length > 0);
}
