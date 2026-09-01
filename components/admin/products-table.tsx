'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { discountPercent, effectivePrice, formatINR } from '@/lib/utils';
import type { Category, Product } from '@/types';

type StockFilter = 'all' | 'in' | 'low' | 'out';

export function ProductsTable({
  products,
  categories,
  initialStock = 'all',
}: {
  products: Product[];
  categories: Category[];
  initialStock?: StockFilter;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('all');
  const [stock, setStock] = React.useState<StockFilter>(initialStock);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => {
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      if (categoryId !== 'all' && p.category_id !== categoryId) return false;
      if (stock === 'out' && p.stock_quantity > 0) return false;
      if (stock === 'low' && (p.stock_quantity <= 0 || p.stock_quantity >= 5)) return false;
      if (stock === 'in' && p.stock_quantity <= 0) return false;
      return true;
    });
  }, [products, query, categoryId, stock]);

  /*
    Ticks survive a search, but the header checkbox only ever speaks for what
    is on screen — "select all" that quietly included forty rows behind a
    filter is how a bulk delete goes wrong.
  */
  const allShownSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allShownSelected) filtered.forEach((p) => next.delete(p.id));
    else filtered.forEach((p) => next.add(p.id));
    setSelected(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const chosen = products.filter((p) => selected.has(p.id));

  async function bulkDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not delete.');
        return;
      }

      // Reported separately: "5 deleted" when two are still in the catalogue
      // as hidden rows is a lie the shop only discovers later.
      const said = [
        data.deleted > 0 ? `${data.deleted} deleted` : null,
        data.retired > 0
          ? `${data.retired} hidden instead, having been ordered before`
          : null,
      ].filter(Boolean);
      toast.success(said.join(' · '));

      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error('Network error — please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            aria-label="Search products"
            className="w-full rounded border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 font-body-md text-sm focus:border-deep-maroon focus:outline-none focus:ring-0"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by collection"
          className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm focus:border-deep-maroon focus:outline-none"
        >
          <option value="all">All collections</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={stock}
          onChange={(e) => setStock(e.target.value as StockFilter)}
          aria-label="Filter by stock"
          className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm focus:border-deep-maroon focus:outline-none"
        >
          <option value="all">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low (under 5)</option>
          <option value="out">Sold out</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? 'No products yet' : 'Nothing matches those filters'}
          body={
            products.length === 0
              ? 'Add your first piece and it will appear on the storefront immediately.'
              : 'Try a different collection or clear the search.'
          }
          action={
            products.length === 0 ? (
              <Button asChild>
                <Link href="/admin/products/new">Add a product</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
          {/* Only present when something is ticked, so a destructive control
              is never sitting next to the pointer by default. */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
              <span className="font-body-md text-sm text-on-surface">
                {selected.size} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center gap-2 border border-error px-4 py-1.5 font-label-sm text-label-sm uppercase tracking-wider text-error transition-colors hover:bg-error hover:text-on-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleAll}
                    aria-label="Select all shown"
                    className="border-earthy-bronze text-deep-maroon focus:ring-primary-container"
                  />
                </th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filtered.map((product) => {
                const off = discountPercent(product);
                return (
                  <tr
                    key={product.id}
                    className={
                      selected.has(product.id)
                        ? 'bg-primary-container/10'
                        : 'transition-colors hover:bg-surface-container-low'
                    }
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                        aria-label={`Select ${product.name}`}
                        className="border-earthy-bronze text-deep-maroon focus:ring-primary-container"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 flex-none overflow-hidden rounded bg-surface-variant">
                          {product.images?.[0] && (
                            <Image
                              src={product.images[0]}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-body-md text-sm font-semibold text-deep-maroon hover:underline"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body-md text-sm text-on-surface-variant">
                      {product.categories?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-body-md text-sm text-on-surface">
                      {formatINR(effectivePrice(product))}
                      {off && (
                        <span className="ml-2 text-xs text-on-surface-variant line-through">
                          {formatINR(product.price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body-md text-sm">
                      <span
                        className={
                          product.stock_quantity <= 0
                            ? 'text-error'
                            : product.stock_quantity < 5
                              ? 'text-earthy-bronze'
                              : 'text-on-surface'
                        }
                      >
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!product.is_active ? (
                        <Badge variant="muted">Hidden</Badge>
                      ) : product.stock_quantity <= 0 ? (
                        <Badge variant="error">Sold out</Badge>
                      ) : (
                        <Badge variant="success">Live</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/products/${product.id}`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body-md text-xs text-on-surface-variant">
        Showing {filtered.length} of {products.length} products.
        {selected.size > 0 && ` · ${selected.size} selected`}
      </p>

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !open && setConfirming(false)}
        title={`Delete ${selected.size} ${selected.size === 1 ? 'piece' : 'pieces'}?`}
        description={describeProductDelete(chosen)}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={bulkDelete}
      />
    </div>
  );
}

/**
 * What the delete will actually do, named before it happens.
 *
 * A piece that appears in a past order is hidden rather than removed, so its
 * name survives on the invoice that was already issued. That is not what
 * "delete" leads a shop to expect, so the dialog says which pieces it applies
 * to before the click, not in a toast afterwards.
 */
function describeProductDelete(chosen: Product[]): string {
  const names = chosen
    .slice(0, 4)
    .map((p) => p.name)
    .join(', ');
  const rest = chosen.length > 4 ? ` and ${chosen.length - 4} more` : '';

  return `${names}${rest}. This cannot be undone. Anything that appears in a past order is hidden from the storefront instead of removed, so old invoices keep their item names.`;
}
