'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { ImageUploader } from '@/components/admin/image-uploader';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/admin/ui';
import { STORE } from '@/lib/config';
import type { Category, HeroSlideRow } from '@/types';

interface Draft {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_href: string;
  sort_order: number;
  is_active: boolean;
}

const blank = (order: number): Draft => ({
  eyebrow: STORE.tagline,
  title: '',
  body: '',
  image_url: '',
  cta_label: '',
  cta_href: '',
  sort_order: order,
  is_active: true,
});

/**
 * The home page banner, as rows the shop can edit.
 *
 * Each slide is shown as a live preview rather than a form alone, because the
 * thing being edited is a picture with words on it — a list of text inputs
 * cannot tell you that a pale headline has landed on a pale part of the
 * photograph.
 */
export function HeroManager({
  initial,
  categories,
}: {
  initial: HeroSlideRow[];
  categories: Category[];
}) {
  const router = useRouter();
  const [slides, setSlides] = React.useState<HeroSlideRow[]>(initial);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleting, setDeleting] = React.useState<HeroSlideRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function refresh() {
    const res = await fetch('/api/admin/hero');
    if (res.ok) setSlides((await res.json()).slides ?? []);
    router.refresh();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/hero', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save the slide.');
      toast.success(draft.id ? 'Slide updated.' : 'Slide added.', {
        description: 'The home page is already showing it.',
      });
      setDraft(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(slide: HeroSlideRow) {
    const res = await fetch(`/api/admin/hero?id=${slide.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Could not delete the slide.');
      return;
    }
    toast.success('Slide deleted.');
    setDeleting(null);
    await refresh();
  }

  /** Swaps sort_order with the neighbour, then persists both. */
  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= slides.length) return;
    const a = slides[index];
    const b = slides[other];
    setBusy(true);
    try {
      await Promise.all([
        fetch('/api/admin/hero', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...a, sort_order: b.sort_order ?? other }),
        }),
        fetch('/api/admin/hero', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...b, sort_order: a.sort_order ?? index }),
        }),
      ]);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(slide: HeroSlideRow) {
    setBusy(true);
    try {
      await fetch('/api/admin/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slide, is_active: !slide.is_active }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDraft(blank(slides.length))} shine>
          <Plus className="h-4 w-4" />
          Add a slide
        </Button>
      </div>

      {slides.length === 0 && !draft && (
        <EmptyState
          title="No banner slides yet"
          body="Until you add one, the home page shows its three built-in slides. Add a slide here and it replaces them."
        />
      )}

      <ul className="space-y-4">
        {slides.map((slide, i) => (
          <li
            key={slide.id}
            className="flex flex-col gap-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4 sm:flex-row"
          >
            <div className="relative h-32 w-full flex-none overflow-hidden rounded bg-surface-variant sm:w-56">
              {slide.image_url && (
                <>
                  <Image
                    src={slide.image_url}
                    alt=""
                    fill
                    sizes="224px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-maroon via-deep-maroon/50 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-center">
                    <p className="font-display-lg text-sm leading-tight text-warm-cream">
                      {slide.title}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-headline-md text-[18px] text-deep-maroon">{slide.title}</p>
                {!slide.is_active && (
                  <span className="rounded-full bg-surface-variant px-2 py-0.5 font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Hidden
                  </span>
                )}
              </div>
              {slide.eyebrow && (
                <p className="mt-0.5 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                  {slide.eyebrow}
                </p>
              )}
              {slide.body && (
                <p className="mt-1 font-body-md text-sm text-on-surface-variant">{slide.body}</p>
              )}
              {slide.cta_label && (
                <p className="mt-2 font-body-md text-xs text-on-surface-variant">
                  Button: <strong>{slide.cta_label}</strong> → {slide.cta_href}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...slide } as Draft)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(slide)} disabled={busy}>
                  {slide.is_active ? 'Hide' : 'Show'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  disabled={busy || i === slides.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(slide)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {draft && (
        <form
          onSubmit={save}
          className="space-y-5 rounded-lg border-2 border-primary-container/60 bg-surface-container-lowest p-6"
        >
          <h2 className="font-headline-md text-headline-md text-deep-maroon">
            {draft.id ? 'Edit slide' : 'New slide'}
          </h2>

          <ImageUploader
            bucket="categories"
            label="Banner image"
            max={1}
            value={draft.image_url ? [draft.image_url] : []}
            onChange={(images) => setDraft({ ...draft, image_url: images[0] ?? '' })}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Eyebrow"
              htmlFor="eyebrow"
              hint="The small line above the headline."
            >
              <Input
                id="eyebrow"
                value={draft.eyebrow}
                onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
              />
            </Field>

            <Field label="Headline" htmlFor="title" required>
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="The Regal Banarasi"
              />
            </Field>
          </div>

          <Field label="Supporting line" htmlFor="body">
            <Textarea
              id="body"
              rows={2}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="Woven with threads of gold, a testament to centuries of royal heritage."
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Button label" htmlFor="cta_label">
              <Input
                id="cta_label"
                value={draft.cta_label}
                onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })}
                placeholder="Shop Banarasi Collection"
              />
            </Field>

            {/* A list, because a hand-typed slug is how the old banner ended
                up pointing at a collection that had been deleted. */}
            <Field
              label="Button link"
              htmlFor="cta_href"
              hint="Pick a collection, or type any path on this site."
            >
              <Input
                id="cta_href"
                list="hero-links"
                value={draft.cta_href}
                onChange={(e) => setDraft({ ...draft, cta_href: e.target.value })}
                placeholder="/collections"
              />
              <datalist id="hero-links">
                <option value="/collections" />
                <option value="/collections?sort=newest" />
                {categories.map((c) => (
                  <option key={c.id} value={`/category/${c.slug}`} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} shine>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {draft.id ? 'Save slide' : 'Add slide'}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this slide?"
        description={`"${deleting?.title ?? ''}" will be removed from the home page. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleting) void remove(deleting);
        }}
      />
    </div>
  );
}
