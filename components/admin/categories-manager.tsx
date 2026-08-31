'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import type { CategoryNavGroup } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ImageUploader } from '@/components/admin/image-uploader';
import { EmptyState } from '@/components/admin/ui';
import { slugify } from '@/lib/utils';
import type { Category } from '@/types';

type CategoryRow = Category & { productCount: number };

interface Draft {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  nav_group: CategoryNavGroup;
  parent_id: string | null;
  /** Set once the slug is edited by hand, so it stops tracking the name. */
  slugTouched: boolean;
}

const BLANK: Draft = {
  name: '',
  slug: '',
  description: '',
  image_url: null,
  nav_group: 'sarees',
  parent_id: null,
  slugTouched: false,
};
const PER_PAGE = 8;

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get('q') ?? '').trim().toLowerCase();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleting, setDeleting] = React.useState<CategoryRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(
    () =>
      query
        ? categories.filter(
            (c) =>
              c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query),
          )
        : categories,
    [categories, query],
  );

  React.useEffect(() => setPage(1), [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PER_PAGE;
  const visible = filtered.slice(start, start + PER_PAGE);

  const allOnPageSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allOnPageSelected) visible.forEach((c) => next.delete(c.id));
    else visible.forEach((c) => next.add(c.id));
    setSelected(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function openNew() {
    setError(null);
    setDraft({ ...BLANK });
  }

  function openEdit(category: CategoryRow) {
    setError(null);
    setDraft({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      image_url: category.image_url,
      nav_group: category.nav_group ?? 'sarees',
      parent_id: category.parent_id ?? null,
      slugTouched: true,
    });
  }

  async function save() {
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      setError('Give the collection a name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        draft.id ? `/api/admin/categories/${draft.id}` : '/api/admin/categories',
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: draft.name.trim(),
            slug: draft.slug || slugify(draft.name),
            description: draft.description.trim() || null,
            image_url: draft.image_url,
            nav_group: draft.nav_group,
            parent_id: draft.parent_id,
            id: draft.id,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save the collection.');
        return;
      }
      toast.success(draft.id ? 'Collection updated.' : 'Collection added.');
      setDraft(null);
      router.refresh();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    const res = await fetch(`/api/admin/categories/${deleting.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Could not delete the collection.');
      return;
    }
    toast.success('Collection deleted.');
    setSelected((s) => {
      const next = new Set(s);
      next.delete(deleting.id);
      return next;
    });
    router.refresh();
  }

  return (
    <>
      {/* ------------------------------------------------------- action bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 font-headline-md text-headline-md text-on-surface">
            Textile Categories
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your handloom collections and how they appear on the storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-deep-maroon px-6 py-2 font-label-lg text-label-lg uppercase tracking-wider text-primary-fixed shadow-sm transition-colors hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {/* ------------------------------------------------------------ table */}
      {categories.length === 0 ? (
        <EmptyState
          title="No collections yet"
          body="Collections group your weaves — Kanchipuram, Banarasi, bridal — and become the storefront navigation."
          action={<Button onClick={openNew}>Add your first collection</Button>}
        />
      ) : (
        <div className="glass-panel ambient-shadow border border-outline-variant">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label="Select all on this page"
                      className="border-earthy-bronze text-deep-maroon focus:ring-primary-container"
                    />
                  </th>
                  {['Category Name', 'Slug', 'Parent', 'Items', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="p-4 font-label-lg text-label-lg font-bold uppercase tracking-wider text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="p-4 text-right font-label-lg text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/50">
                {visible.map((category) => (
                  <tr
                    key={category.id}
                    className="group transition-colors hover:bg-surface-container-lowest"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.has(category.id)}
                        onChange={() => toggleOne(category.id)}
                        aria-label={`Select ${category.name}`}
                        className="border-earthy-bronze text-deep-maroon focus:ring-primary-container"
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden border border-outline-variant/30 bg-surface-variant">
                          {category.image_url && (
                            <Image
                              src={category.image_url}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <span className="font-headline-md text-lg text-on-surface">
                          {category.name}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-sm text-on-surface-variant">
                      /{category.slug}
                    </td>
                    {/* The column existed but was always a dash. It now shows
                        the section a row sits under, which is the only way to
                        read the tree from the list. */}
                    <td className="p-4 text-on-surface-variant">
                      {category.parent_id ? (
                        categories.find((c) => c.id === category.parent_id)?.name ?? '—'
                      ) : (
                        <span className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                          Section
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-on-surface-variant">{category.productCount}</td>

                    <td className="p-4">
                      {category.productCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8e6c9] bg-[#e8f5e9] px-3 py-1 text-xs font-bold tracking-wider text-[#1b5e20]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4caf50]" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-variant px-3 py-1 text-xs font-bold tracking-wider text-on-surface-variant">
                          <span className="h-1.5 w-1.5 rounded-full bg-outline" />
                          Empty
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {/* Revealed on hover for pointers, always present for keyboards. */}
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <Link
                          href={`/category/${category.slug}`}
                          target="_blank"
                          aria-label={`View ${category.name} on the store`}
                          className="p-1 font-label-sm text-label-sm uppercase text-on-surface-variant hover:text-primary"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          aria-label={`Edit ${category.name}`}
                          className="p-1 text-on-surface-variant hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(category)}
                          aria-label={`Delete ${category.name}`}
                          className="p-1 text-on-surface-variant hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-on-surface-variant">
                      Nothing matches &ldquo;{params.get('q')}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-low p-4">
            <span className="text-sm text-on-surface-variant">
              {filtered.length === 0
                ? 'No categories'
                : `Showing ${start + 1} to ${Math.min(start + PER_PAGE, filtered.length)} of ${filtered.length} categories`}
              {selected.size > 0 && ` · ${selected.size} selected`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="border border-outline-variant px-3 py-1 text-on-surface-variant transition-colors hover:bg-surface disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="border border-outline-variant px-3 py-1 text-on-surface-variant transition-colors hover:bg-surface disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ editor modal */}
      <Dialog open={draft != null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Edit collection' : 'New collection'}</DialogTitle>
            <DialogDescription>
              The slug becomes the URL: /category/<em>{draft?.slug || 'your-slug'}</em>
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <Field label="Name" htmlFor="category-name" required>
                <Input
                  id="category-name"
                  value={draft.name}
                  autoFocus
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      name: e.target.value,
                      slug: draft.slugTouched ? draft.slug : slugify(e.target.value),
                    })
                  }
                />
              </Field>

              <Field label="Slug" htmlFor="category-slug" error={error}>
                <Input
                  id="category-slug"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft({ ...draft, slug: slugify(e.target.value), slugTouched: true })
                  }
                />
              </Field>

              <Field label="Description" htmlFor="category-description">
                <Textarea
                  id="category-description"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>

              {/* A section is simply a category with no parent, so the tree
                  needs no separate "is a section" flag to fall out of step
                  with. Only top-level rows are offered, and never itself. */}
              <Field
                label="Belongs to"
                htmlFor="category-parent"
                hint={
                  draft.parent_id
                    ? 'A subcategory. It appears in that section’s dropdown.'
                    : 'A top-level section. It becomes its own item in the main menu.'
                }
              >
                <Select
                  id="category-parent"
                  value={draft.parent_id ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, parent_id: e.target.value || null })
                  }
                >
                  <option value="">Nothing — this is a top-level section</option>
                  {categories
                    .filter((c) => c.parent_id === null && c.id !== draft.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </Field>

              <Field
                label="Where it appears in the menu"
                htmlFor="category-nav-group"
                hint={
                  draft.nav_group === 'sarees'
                    ? 'Inside the Sarees dropdown — right for a weave.'
                    : draft.nav_group === 'standalone'
                      ? 'Its own item in the top menu — right for a different garment, like churidars.'
                      : 'Not in the menu. Still reachable by its link and by search.'
                }
              >
                <Select
                  id="category-nav-group"
                  value={draft.nav_group}
                  onChange={(e) =>
                    setDraft({ ...draft, nav_group: e.target.value as CategoryNavGroup })
                  }
                >
                  <option value="sarees">Under Sarees</option>
                  <option value="standalone">Its own menu item</option>
                  <option value="hidden">Hidden from the menu</option>
                </Select>
              </Field>

              <ImageUploader
                bucket="categories"
                label="Cover image"
                max={1}
                value={draft.image_url ? [draft.image_url] : []}
                onChange={(images) => setDraft({ ...draft, image_url: images[0] ?? null })}
              />

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} shine>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save collection'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description={
          (deleting?.productCount ?? 0) > 0
            ? `This collection still holds ${deleting?.productCount} pieces. Move them to another collection first — the delete will be refused otherwise.`
            : 'This cannot be undone. The collection will disappear from the storefront navigation.'
        }
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </>
  );
}
