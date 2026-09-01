'use client';

import * as React from 'react';
import Image from 'next/image';
import { Ruler } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatINR } from '@/lib/utils';
import { optionKey, type VariantAxis } from '@/lib/variant-key';
import { useEffectiveOptions, useVariantStore } from '@/stores/variant-store';
import type { OptionDetail, ProductVariant } from '@/types';

// Re-exported so every call site keeps importing the picker and its axes from
// one place; the logic itself is pure and lives beside the key it sorts by.
export { axesForProduct, type VariantAxis } from '@/lib/variant-key';


interface VariantPickerProps {
  productId: string;
  axes: VariantAxis[];
  variants: ProductVariant[];
  optionDetails: Record<string, OptionDetail>;
  /** Shown against a combination priced the same as the product. */
  basePrice: number;
  /** Struck through beside a value's own price, where there is a discount. */
  listPrice?: number | null;
  className?: string;
}

/**
 * One row per axis — Colour, then Size — and the measurements behind them.
 *
 * Nothing here names an axis. A shop that decides sarees vary by border
 * colour ticks a box on the piece and this renders it, which is the whole
 * reason the axes are attributes rather than columns.
 *
 * How a row is drawn follows from what the shop has entered against its
 * values, not from what the axis is called:
 *
 *   values with photographs   swatches, so a colour is seen and not read
 *   values with measurements  the figures beside the heading, and a guide
 *   everything else           plain chips
 *
 * Values that cannot be reached stay on show rather than disappearing: a
 * shopper who wanted the L needs to see that the L exists and is gone, not be
 * left wondering whether the piece is simply cut short.
 *
 * A row offering one value is not a choice, and is stated rather than asked.
 * Left as a button it read as an unanswered question, and the buy button sat
 * dead behind it saying "select colour and pattern" on a piece that came in
 * exactly one of each.
 */
export function VariantPicker({
  productId,
  axes,
  variants,
  optionDetails,
  basePrice,
  listPrice,
  className,
}: VariantPickerProps) {
  const selected = useEffectiveOptions(productId, axes);
  const select = useVariantStore((s) => s.select);
  const [guideAxis, setGuideAxis] = React.useState<string | null>(null);

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

  /** The cheapest this value can be had for, for the price under a swatch. */
  const priceFor = React.useCallback(
    (slug: string, value: string) => {
      const prices = variants
        .filter((v) => v.is_active && v.options[slug] === value)
        .map((v) => v.price ?? basePrice);
      return prices.length > 0 ? Math.min(...prices) : basePrice;
    },
    [variants, basePrice],
  );

  const complete = axes.every((axis) => selected[axis.slug]);
  const chosen = complete
    ? (variants.find(
        (v) =>
          v.option_key ===
          optionKey(Object.fromEntries(axes.map((a) => [a.slug, selected[a.slug]]))),
      ) ?? null)
    : null;

  const detail = (slug: string, value: string) => optionDetails[`${slug}:${value}`];

  const guide = axes.find((a) => a.slug === guideAxis);

  return (
    <div className={cn('space-y-6', className)}>
      {axes.map((axis) => {
        /*
          Which shape this row takes is read off the shop's own data. An axis
          whose values have been photographed is worth seeing; one with
          figures against it is worth measuring; the rest are just words.
        */
        const hasImages = axis.values.some((v) => (detail(axis.slug, v)?.images.length ?? 0) > 0);
        const measured = axis.values.some(
          (v) => Object.keys(detail(axis.slug, v)?.measurements ?? {}).length > 0,
        );
        const current = selected[axis.slug];
        const currentFigures = current ? (detail(axis.slug, current)?.measurements ?? {}) : {};
        const settled = axis.values.length === 1;

        return (
          <div key={axis.slug} className={settled ? undefined : 'space-y-3'}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span
                id={`axis-${productId}-${axis.slug}`}
                className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
              >
                {axis.name}
                {current && <span className="ml-2 text-deep-maroon">{current}</span>}
                {/* The figures for the size in hand, where the shopper is
                    already looking, rather than only inside the guide. */}
                {Object.keys(currentFigures).length > 0 && (
                  <span className="ml-3 font-body-md text-sm normal-case tracking-normal text-on-surface-variant">
                    {Object.entries(currentFigures)
                      .map(([name, value]) => `${name} ${value}`)
                      .join(' · ')}
                  </span>
                )}
              </span>

              {measured && (
                <button
                  type="button"
                  onClick={() => setGuideAxis(axis.slug)}
                  className="inline-flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze hover:text-deep-maroon"
                >
                  <Ruler className="h-3.5 w-3.5" />
                  {axis.name} guide
                </button>
              )}
            </div>

            {settled ? null : hasImages ? (
              /* Swatches scroll rather than wrap: a shop with nine colours
                 would otherwise push the Add to cart button off the screen. */
              <div
                role="radiogroup"
                aria-labelledby={`axis-${productId}-${axis.slug}`}
                className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2"
              >
                {axis.values.map((value) => {
                  const active = current === value;
                  const available = reachable(axis.slug, value);
                  const art = detail(axis.slug, value)?.images[0];
                  const price = priceFor(axis.slug, value);
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`${value}${available ? '' : ' — unavailable'}`}
                      disabled={!available && !active}
                      onClick={() => select(productId, axis.slug, active ? null : value)}
                      className={cn(
                        'w-[7.5rem] flex-none snap-start border p-1.5 text-left transition-colors',
                        active
                          ? 'border-deep-maroon ring-1 ring-deep-maroon'
                          : 'border-outline-variant hover:border-deep-maroon',
                        !available && !active && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      <span className="relative block aspect-[3/4] overflow-hidden bg-surface-variant">
                        {art && (
                          <Image
                            src={art}
                            alt=""
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="mt-2 block truncate font-body-md text-sm text-on-surface">
                        {value}
                      </span>
                      <span className="block font-body-md text-sm text-deep-maroon">
                        {formatINR(price)}
                      </span>
                      {listPrice != null && listPrice > price && (
                        <span className="block font-body-md text-xs text-on-surface-variant/80 line-through">
                          {formatINR(listPrice)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-labelledby={`axis-${productId}-${axis.slug}`}
                className="flex flex-wrap gap-2"
              >
                {axis.values.map((value) => {
                  const active = current === value;
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
                      {/* A line through the label, rather than removing it. */}
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
            )}
          </div>
        );
      })}

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

      <Dialog open={guide != null} onOpenChange={(open) => !open && setGuideAxis(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{guide?.name} guide</DialogTitle>
            <DialogDescription>
              Measured flat, in inches. Allow a little ease for a comfortable fit.
            </DialogDescription>
          </DialogHeader>
          {guide && <MeasurementTable axis={guide} optionDetails={optionDetails} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeasurementTable({
  axis,
  optionDetails,
}: {
  axis: VariantAxis;
  optionDetails: Record<string, OptionDetail>;
}) {
  const rows = axis.values
    .map((value) => ({
      value,
      measurements: optionDetails[`${axis.slug}:${value}`]?.measurements ?? {},
    }))
    .filter((row) => Object.keys(row.measurements).length > 0);

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row.measurements))));

  return (
    <div className="overflow-x-auto border border-outline-variant/40">
      <table className="w-full min-w-[320px] border-collapse text-left">
        <thead>
          <tr className="border-b border-outline-variant/40 bg-surface-container-low">
            <th className="p-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
              {axis.name}
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
          {rows.map((row) => (
            <tr key={row.value}>
              <td className="p-3 font-body-md text-sm text-on-surface">{row.value}</td>
              {columns.map((column) => (
                <td key={column} className="p-3 font-body-md text-sm text-on-surface-variant">
                  {row.measurements[column] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
