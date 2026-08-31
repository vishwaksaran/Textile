'use client';

import * as React from 'react';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface VariantDraftUI {
  /** Absent on a size that has not been saved yet. */
  id?: string;
  label: string;
  sku: string;
  /** Strings, because a half-typed number field is not a number. */
  stock: string;
  price: string;
  measurements: Record<string, string>;
  /** False for a size that has been sold and can no longer be deleted. */
  removable: boolean;
}

interface VariantFieldsProps {
  variants: VariantDraftUI[];
  onChange: (next: VariantDraftUI[]) => void;
  /** One-click sizes from the product's category. */
  presets?: string[];
  className?: string;
}

export const blankVariant = (label = ''): VariantDraftUI => ({
  label,
  sku: '',
  stock: '0',
  price: '',
  measurements: {},
  removable: true,
});

/**
 * Sizes for one product, edited inside the product form.
 *
 * Deliberately not its own screen: a size is not a thing a shop thinks about
 * on its own — it is part of the piece — and a separate module would mean two
 * places to look for one product's stock.
 *
 * Measurements are columns rather than free pairs per row, because what they
 * are for is the size table on the product page, and a table needs every row
 * to answer the same questions.
 */
export function VariantFields({ variants, onChange, presets = [], className }: VariantFieldsProps) {
  const [newMeasurement, setNewMeasurement] = React.useState('');

  const columns = React.useMemo(
    () => Array.from(new Set(variants.flatMap((v) => Object.keys(v.measurements)))),
    [variants],
  );

  const update = (index: number, patch: Partial<VariantDraftUI>) =>
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const remove = (index: number) => onChange(variants.filter((_, i) => i !== index));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= variants.length) return;
    const next = [...variants];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addColumn = () => {
    const name = newMeasurement.trim();
    if (!name || columns.includes(name)) return;
    onChange(
      variants.map((v) => ({ ...v, measurements: { ...v.measurements, [name]: '' } })),
    );
    setNewMeasurement('');
  };

  const dropColumn = (name: string) =>
    onChange(
      variants.map((v) => {
        const next = { ...v.measurements };
        delete next[name];
        return { ...v, measurements: next };
      }),
    );

  const used = new Set(variants.map((v) => v.label.trim().toLowerCase()));
  const unusedPresets = presets.filter((p) => !used.has(p.trim().toLowerCase()));

  const total = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div className={cn('space-y-4', className)}>
      {variants.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No sizes. Stock is managed as a single number above — right for a saree, and for
          anything else sold as one piece.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="w-8" />
                {['Size', 'Stock', 'SKU', 'Price'].map((h) => (
                  <th
                    key={h}
                    className="p-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
                {columns.map((column) => (
                  <th
                    key={column}
                    className="p-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                  >
                    <span className="inline-flex items-center gap-1">
                      {column}
                      <button
                        type="button"
                        onClick={() => dropColumn(column)}
                        aria-label={`Remove the ${column} measurement`}
                        className="text-on-surface-variant hover:text-error"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/40">
              {variants.map((variant, index) => (
                <tr key={variant.id ?? `new-${index}`}>
                  <td className="p-1 align-middle">
                    {/* The order here is the order on the storefront, so it
                        has to be arrangeable — S, M, L, XL is not alphabetical
                        and not the order they were typed in. */}
                    <div className="flex flex-col text-on-surface-variant">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${variant.label || 'this size'} up`}
                        className="px-1 leading-none disabled:opacity-25"
                      >
                        ▲
                      </button>
                      <GripVertical className="mx-auto h-3 w-3 opacity-30" aria-hidden />
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === variants.length - 1}
                        aria-label={`Move ${variant.label || 'this size'} down`}
                        className="px-1 leading-none disabled:opacity-25"
                      >
                        ▼
                      </button>
                    </div>
                  </td>

                  <td className="p-1">
                    <Input
                      value={variant.label}
                      placeholder="M"
                      aria-label={`Size ${index + 1} label`}
                      onChange={(e) => update(index, { label: e.target.value })}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      value={variant.stock}
                      inputMode="numeric"
                      aria-label={`Stock for ${variant.label || `size ${index + 1}`}`}
                      onChange={(e) =>
                        update(index, { stock: e.target.value.replace(/\D/g, '') })
                      }
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      value={variant.sku}
                      placeholder="Optional"
                      aria-label={`SKU for ${variant.label || `size ${index + 1}`}`}
                      onChange={(e) => update(index, { sku: e.target.value })}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      value={variant.price}
                      inputMode="decimal"
                      placeholder="Same"
                      aria-label={`Price for ${variant.label || `size ${index + 1}`}`}
                      onChange={(e) =>
                        update(index, { price: e.target.value.replace(/[^\d.]/g, '') })
                      }
                    />
                  </td>

                  {columns.map((column) => (
                    <td key={column} className="p-1">
                      <Input
                        value={variant.measurements[column] ?? ''}
                        placeholder="—"
                        aria-label={`${column} for ${variant.label || `size ${index + 1}`}`}
                        onChange={(e) =>
                          update(index, {
                            measurements: {
                              ...variant.measurements,
                              [column]: e.target.value,
                            },
                          })
                        }
                      />
                    </td>
                  ))}

                  <td className="p-1 text-right">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove ${variant.label || `size ${index + 1}`}`}
                      title={
                        variant.removable
                          ? undefined
                          : 'This size has been sold. Removing it retires it rather than deleting it.'
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
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange([...variants, blankVariant()])}
          className="inline-flex items-center gap-1.5 border border-outline-variant px-3 py-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface transition-colors hover:border-deep-maroon"
        >
          <Plus className="h-3.5 w-3.5" />
          Add size
        </button>

        {/* Suggestions from the category, so a churidar offers S/M/L/XL and a
            saree offers nothing at all. */}
        {unusedPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange([...variants, blankVariant(preset)])}
            className="border border-dashed border-outline-variant px-3 py-2 font-body-md text-sm text-on-surface-variant transition-colors hover:border-deep-maroon hover:text-deep-maroon"
          >
            + {preset}
          </button>
        ))}
      </div>

      {variants.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-outline-variant/40 pt-4">
          <label className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
              Add a measurement
            </span>
            <Input
              value={newMeasurement}
              placeholder="Chest"
              className="w-40"
              onChange={(e) => setNewMeasurement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                // Otherwise this submits the product form.
                e.preventDefault();
                addColumn();
              }}
            />
          </label>
          <p className="font-body-md text-sm text-on-surface-variant">
            Total stock: <strong className="text-on-surface">{total}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
