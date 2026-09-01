'use client';

import * as React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ImageUploader } from '@/components/admin/image-uploader';
import { optionKey, variantLabel } from '@/lib/variant-key';
import { cn } from '@/lib/utils';

export interface VariantAxisDef {
  slug: string;
  name: string;
  /** Everything the attribute offers; the shop picks which apply here. */
  options: string[];
}

export interface VariantDraftUI {
  /** Absent on a combination that has not been saved yet. */
  id?: string;
  options: Record<string, string>;
  sku: string;
  /** Strings, because a half-typed number field is not a number. */
  stock: string;
  price: string;
  /** False for a combination that has been sold and can no longer be deleted. */
  removable: boolean;
}

export interface OptionDetailUI {
  images: string[];
  measurements: Record<string, string>;
}

interface VariantFieldsProps {
  axes: VariantAxisDef[];
  /** Values chosen for this product, per axis, in the order they appear. */
  chosen: Record<string, string[]>;
  onChosenChange: (next: Record<string, string[]>) => void;
  variants: VariantDraftUI[];
  onVariantsChange: (next: VariantDraftUI[]) => void;
  /** Keyed `slug:value`: photographs and measurements for one value. */
  details: Record<string, OptionDetailUI>;
  onDetailsChange: (next: Record<string, OptionDetailUI>) => void;
  className?: string;
}

const blankDetail = (): OptionDetailUI => ({ images: [], measurements: {} });

/**
 * Variants for one product, edited inside the product form.
 *
 * The shop picks which values it stocks along each axis, and the grid of
 * combinations follows. Typing twelve rows of "Green / M" by hand is how a
 * combination gets missed, and a missed combination is one a shopper cannot
 * buy for a reason nobody can see.
 *
 * Deliberately not its own screen: a variant is not something a shop thinks
 * about apart from the piece it belongs to, and a separate module would mean
 * two places to look for one product's stock.
 */
export function VariantFields({
  axes,
  chosen,
  onChosenChange,
  variants,
  onVariantsChange,
  details,
  onDetailsChange,
  className,
}: VariantFieldsProps) {
  const [newValue, setNewValue] = React.useState<Record<string, string>>({});
  const byKey = React.useMemo(
    () => new Map(variants.map((v) => [optionKey(v.options), v])),
    [variants],
  );

  /**
   * Every combination of the chosen values, in axis order.
   *
   * Rebuilt from the values rather than stored, so adding a colour adds a row
   * per size without disturbing the stock already entered against the others —
   * existing rows are matched back by their combination.
   */
  const rebuild = React.useCallback(
    (values: Record<string, string[]>) => {
      const active = axes.filter((a) => (values[a.slug] ?? []).length > 0);
      if (active.length === 0) return [];

      let rows: Record<string, string>[] = [{}];
      for (const axis of active) {
        rows = rows.flatMap((row) =>
          (values[axis.slug] ?? []).map((value) => ({ ...row, [axis.slug]: value })),
        );
      }

      return rows.map((options) => {
        const existing = byKey.get(optionKey(options));
        return (
          existing ?? {
            options,
            sku: '',
            stock: '0',
            price: '',
            removable: true,
          }
        );
      });
    },
    [axes, byKey],
  );

  const setValues = (next: Record<string, string[]>) => {
    onChosenChange(next);
    onVariantsChange(rebuild(next));
  };

  const toggleValue = (slug: string, value: string) => {
    const current = chosen[slug] ?? [];
    setValues({
      ...chosen,
      [slug]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };

  const addTyped = (slug: string) => {
    const value = (newValue[slug] ?? '').trim();
    if (!value) return;
    const current = chosen[slug] ?? [];
    if (!current.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setValues({ ...chosen, [slug]: [...current, value] });
    }
    setNewValue((s) => ({ ...s, [slug]: '' }));
  };

  const updateRow = (index: number, patch: Partial<VariantDraftUI>) =>
    onVariantsChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const axisSlugs = axes.map((a) => a.slug);
  const total = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  if (axes.length === 0) {
    return (
      <p className={cn('font-body-md text-body-md text-on-surface-variant', className)}>
        Nothing ticked above, so stock is the single number in Price &amp; stock — right for a
        saree, and for anything else sold as one piece.
      </p>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* ------------------------------------------------- values per axis */}
      {axes.map((axis) => (
        <div key={axis.slug} className="space-y-3">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
            {axis.name} stocked
          </span>

          <div className="flex flex-wrap gap-2">
            {axis.options.map((value) => {
              const active = (chosen[axis.slug] ?? []).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleValue(axis.slug, value)}
                  className={cn(
                    'border px-3 py-2 font-body-md text-sm transition-colors',
                    active
                      ? 'border-deep-maroon bg-deep-maroon text-primary-fixed'
                      : 'border-outline-variant text-on-surface hover:border-deep-maroon',
                  )}
                >
                  {value}
                </button>
              );
            })}

            {/* Values the shop uses that the attribute has never been told
                about. Typed once here, they behave like any other. */}
            {(chosen[axis.slug] ?? [])
              .filter((v) => !axis.options.includes(v))
              .map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 border border-deep-maroon bg-deep-maroon px-3 py-2 font-body-md text-sm text-primary-fixed"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => toggleValue(axis.slug, value)}
                    aria-label={`Remove ${value}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newValue[axis.slug] ?? ''}
              placeholder={`Another ${axis.name.toLowerCase()}`}
              className="w-56"
              onChange={(e) => setNewValue((s) => ({ ...s, [axis.slug]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                // Otherwise this submits the product form.
                e.preventDefault();
                addTyped(axis.slug);
              }}
            />
            <button
              type="button"
              onClick={() => addTyped(axis.slug)}
              className="inline-flex items-center gap-1.5 border border-outline-variant px-3 py-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface transition-colors hover:border-deep-maroon"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      ))}

      {/* ------------------------------------------------------- the grid */}
      {variants.length > 0 && (
        <div className="space-y-3 border-t border-outline-variant/40 pt-6">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
            Stock per combination
          </span>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  {axes.map((axis) => (
                    <th
                      key={axis.slug}
                      className="p-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                    >
                      {axis.name}
                    </th>
                  ))}
                  {['Stock', 'SKU', 'Price'].map((h) => (
                    <th
                      key={h}
                      className="p-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/40">
                {variants.map((variant, index) => (
                  <tr key={variant.id ?? optionKey(variant.options)}>
                    {axes.map((axis) => (
                      <td
                        key={axis.slug}
                        className="p-2 font-body-md text-sm text-on-surface"
                      >
                        {variant.options[axis.slug] ?? '—'}
                      </td>
                    ))}

                    <td className="p-1">
                      <Input
                        value={variant.stock}
                        inputMode="numeric"
                        aria-label={`Stock for ${variantLabel(variant.options, axisSlugs)}`}
                        onChange={(e) =>
                          updateRow(index, { stock: e.target.value.replace(/\D/g, '') })
                        }
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        value={variant.sku}
                        placeholder="Optional"
                        aria-label={`SKU for ${variantLabel(variant.options, axisSlugs)}`}
                        onChange={(e) => updateRow(index, { sku: e.target.value })}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        value={variant.price}
                        inputMode="decimal"
                        placeholder="Same"
                        aria-label={`Price for ${variantLabel(variant.options, axisSlugs)}`}
                        onChange={(e) =>
                          updateRow(index, { price: e.target.value.replace(/[^\d.]/g, '') })
                        }
                      />
                    </td>

                    <td className="p-1 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onVariantsChange(variants.filter((_, i) => i !== index))
                        }
                        aria-label={`Remove ${variantLabel(variant.options, axisSlugs)}`}
                        title={
                          variant.removable
                            ? undefined
                            : 'This has been sold. Removing it retires it rather than deleting it.'
                        }
                        className="p-2 text-on-surface-variant transition-colors hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-right font-body-md text-sm text-on-surface-variant">
            Total stock: <strong className="text-on-surface">{total}</strong>
          </p>
        </div>
      )}

      {/* ------------------------------ photographs and figures per value */}
      {axes.some((axis) => (chosen[axis.slug] ?? []).length > 0) && (
        <div className="space-y-8 border-t border-outline-variant/40 pt-6">
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
              Photographs &amp; measurements
            </span>
            <p className="font-body-md text-sm text-on-surface-variant">
              Attached to the value, not to each row: green photographs are the same in every
              size, and an M measures the same in every colour.
            </p>
          </div>

          {/* Every axis at once, rather than one behind a switch. Uploading
              colour photographs and then forgetting the pattern ones is the
              obvious mistake, and a control that hides half the work is what
              invites it. */}
          {axes.map((axis) => (
            <AxisDetails
              key={axis.slug}
              axis={axis}
              values={chosen[axis.slug] ?? []}
              details={details}
              onDetailsChange={onDetailsChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One axis's photographs and measurements.
 *
 * Its own component because there is one of these per axis now, each with a
 * measurement box of its own — a single shared box wrote whatever was typed
 * into it to whichever axis happened to be on screen.
 */
function AxisDetails({
  axis,
  values,
  details,
  onDetailsChange,
}: {
  axis: VariantAxisDef;
  values: string[];
  details: Record<string, OptionDetailUI>;
  onDetailsChange: (next: Record<string, OptionDetailUI>) => void;
}) {
  const [newMeasurement, setNewMeasurement] = React.useState('');

  if (values.length === 0) return null;

  const key = (value: string) => `${axis.slug}:${value}`;

  const columns = Array.from(
    new Set(values.flatMap((value) => Object.keys(details[key(value)]?.measurements ?? {}))),
  );

  const setDetail = (k: string, patch: Partial<OptionDetailUI>) =>
    onDetailsChange({ ...details, [k]: { ...(details[k] ?? blankDetail()), ...patch } });

  const addColumn = () => {
    const name = newMeasurement.trim();
    if (!name || columns.includes(name)) return;
    const next = { ...details };
    for (const value of values) {
      next[key(value)] = {
        ...(next[key(value)] ?? blankDetail()),
        measurements: { ...(next[key(value)]?.measurements ?? {}), [name]: '' },
      };
    }
    onDetailsChange(next);
    setNewMeasurement('');
  };

  const dropColumn = (column: string) => {
    const next = { ...details };
    for (const value of values) {
      const measurements = { ...(next[key(value)]?.measurements ?? {}) };
      delete measurements[column];
      next[key(value)] = { ...(next[key(value)] ?? blankDetail()), measurements };
    }
    onDetailsChange(next);
  };

  return (
    <section className="space-y-4 rounded border border-outline-variant/40 p-4">
      <h3 className="font-headline-md text-lg text-on-surface">{axis.name}</h3>

      {columns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  {axis.name}
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="p-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                  >
                    <span className="inline-flex items-center gap-1">
                      {column}
                      <button
                        type="button"
                        aria-label={`Remove the ${column} measurement from ${axis.name}`}
                        className="text-on-surface-variant hover:text-error"
                        onClick={() => dropColumn(column)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {values.map((value) => (
                <tr key={value}>
                  <td className="p-2 font-body-md text-sm text-on-surface">{value}</td>
                  {columns.map((column) => (
                    <td key={column} className="p-1">
                      <Input
                        value={details[key(value)]?.measurements?.[column] ?? ''}
                        placeholder="—"
                        aria-label={`${column} for ${value}`}
                        onChange={(e) =>
                          setDetail(key(value), {
                            measurements: {
                              ...(details[key(value)]?.measurements ?? {}),
                              [column]: e.target.value,
                            },
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          Add a measurement
        </span>
        <Input
          value={newMeasurement}
          placeholder="Chest"
          className="w-40"
          aria-label={`Add a measurement to ${axis.name}`}
          onChange={(e) => setNewMeasurement(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            // Otherwise this submits the product form.
            e.preventDefault();
            addColumn();
          }}
        />
        <button
          type="button"
          onClick={addColumn}
          className="inline-flex items-center gap-1.5 border border-outline-variant px-3 py-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface transition-colors hover:border-deep-maroon"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {values.map((value) => (
          <ImageUploader
            key={value}
            bucket="products"
            label={`Photographs for ${value} — shown when it is chosen`}
            value={details[key(value)]?.images ?? []}
            onChange={(images) => setDetail(key(value), { images })}
          />
        ))}
      </div>
    </section>
  );
}
