'use client';

import * as React from 'react';
import Image from 'next/image';
import { GripVertical, ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  bucket: 'products' | 'categories';
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label?: string;
}

/**
 * Drag-and-drop uploader. Images go straight to Supabase Storage through
 * /api/admin/upload; the first image is the one the storefront shows.
 */
export function ImageUploader({
  bucket,
  value,
  onChange,
  max = 6,
  label = 'Images',
}: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const dragIndex = React.useRef<number | null>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    const room = max - value.length;

    if (room <= 0) {
      toast.error(`Up to ${max} images per item.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];

    for (const file of list.slice(0, room)) {
      const form = new FormData();
      form.append('file', file);
      form.append('bucket', bucket);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? `Could not upload ${file.name}`);
          continue;
        }
        uploaded.push(data.url);
      } catch {
        toast.error(`Could not upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded.`);
    }
    setUploading(false);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
        {label}{' '}
        <span className="normal-case tracking-normal opacity-70">
          ({value.length}/{max} — the first is the cover)
        </span>
      </span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) void upload(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-lg border border-dashed p-4 transition-colors',
          dragging ? 'border-primary-container bg-primary-container/10' : 'border-outline-variant',
        )}
      >
        {value.length > 0 && (
          <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {value.map((url, index) => (
              <li
                key={url}
                draggable
                onDragStart={() => (dragIndex.current = index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  if (dragIndex.current != null) reorder(dragIndex.current, index);
                  dragIndex.current = null;
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded border border-outline-variant/40 bg-surface-variant"
              >
                <Image src={url} alt="" fill sizes="120px" className="object-cover" />

                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-deep-maroon px-1.5 py-0.5 font-label-sm text-[9px] uppercase text-primary-fixed">
                    Cover
                  </span>
                )}

                <span className="absolute bottom-1 left-1 rounded bg-warm-cream/80 p-1 text-deep-maroon opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-3 w-3" />
                </span>

                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 rounded-full bg-warm-cream/90 p-1 text-error opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || value.length >= max}
          className="flex w-full flex-col items-center gap-2 rounded py-6 text-on-surface-variant transition-colors hover:text-deep-maroon disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
          )}
          <span className="font-body-md text-sm">
            {uploading ? 'Uploading…' : 'Drop images here, or click to choose'}
          </span>
          <span className="font-body-md text-xs opacity-70">JPEG, PNG, WebP or AVIF · up to 5 MB</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <details className="font-body-md text-xs text-on-surface-variant">
        <summary className="cursor-pointer">Or paste an image URL</summary>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem('url') as HTMLInputElement);
            const url = input.value.trim();
            if (!url) return;
            if (value.length >= max) {
              toast.error(`Up to ${max} images per item.`);
              return;
            }
            onChange([...value, url]);
            input.value = '';
          }}
        >
          <input
            name="url"
            type="url"
            placeholder="https://…"
            className="flex-1 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:border-deep-maroon focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="rounded border border-outline-variant px-3 py-2 font-label-sm text-label-sm uppercase text-deep-maroon"
          >
            Add
          </button>
        </form>
      </details>
    </div>
  );
}
