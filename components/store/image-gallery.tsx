'use client';

import * as React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  alt: string;
  /** Dims the artwork when the piece can no longer be bought. */
  dimmed?: boolean;
}

/**
 * Swipeable gallery: drag on touch, arrows and thumbnails on desktop, a
 * hover magnifier on fine pointers, and a full-screen pinch-zoom overlay.
 */
export function ImageGallery({ images, alt, dimmed = false }: ImageGalleryProps) {
  const shots = images.length > 0 ? images : [];
  const [index, setIndex] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const [lens, setLens] = React.useState<{ x: number; y: number } | null>(null);

  const go = React.useCallback(
    (next: number) => setIndex((next + shots.length) % Math.max(shots.length, 1)),
    [shots.length],
  );

  React.useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomOpen(false);
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOpen, index, go]);

  if (shots.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-surface-variant font-body-md text-on-surface-variant">
        No image available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-variant/50"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setLens({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
          });
        }}
        onMouseLeave={() => setLens(null)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={index}
            className="absolute inset-0 cursor-zoom-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            drag={shots.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(index + 1);
              if (info.offset.x > 60) go(index - 1);
            }}
            onClick={() => setZoomOpen(true)}
          >
            <Image
              src={shots[index]}
              alt={`${alt} — view ${index + 1} of ${shots.length}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              quality={92}
              className={cn(
                'select-none object-cover transition-transform duration-300',
                dimmed && 'opacity-70 saturate-[0.7]',
              )}
              style={
                lens
                  ? {
                      transform: 'scale(1.6)',
                      transformOrigin: `${lens.x}% ${lens.y}%`,
                    }
                  : undefined
              }
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Open full-screen view"
          className="absolute right-3 top-3 z-[2] rounded-full bg-warm-cream/90 p-2 text-deep-maroon opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {shots.length > 1 && (
          <>
            <GalleryArrow side="left" onClick={() => go(index - 1)} />
            <GalleryArrow side="right" onClick={() => go(index + 1)} />
            <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1.5 md:hidden">
              {shots.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    i === index ? 'bg-deep-maroon' : 'bg-deep-maroon/30',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {shots.length > 1 && (
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Product images">
          {shots.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`View image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'relative h-20 w-16 flex-none overflow-hidden rounded border transition-all',
                i === index
                  ? 'border-primary-container ring-1 ring-primary-container'
                  : 'border-outline-variant/60 opacity-70 hover:opacity-100',
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {zoomOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-deep-maroon/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} — enlarged`}
            onClick={() => setZoomOpen(false)}
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full bg-warm-cream/90 p-2 text-deep-maroon"
              onClick={() => setZoomOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {/* touch-action lets the browser handle real pinch-zoom natively. */}
            <div
              className="relative h-full w-full max-w-3xl"
              style={{ touchAction: 'pinch-zoom' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={shots[index]}
                alt={alt}
                fill
                sizes="100vw"
                quality={95}
                className="object-contain"
                priority
              />
            </div>
            {shots.length > 1 && (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-4">
                <button
                  type="button"
                  aria-label="Previous image"
                  className="rounded-full bg-warm-cream/90 p-2 text-deep-maroon"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(index - 1);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  className="rounded-full bg-warm-cream/90 p-2 text-deep-maroon"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(index + 1);
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={cn(
        'absolute top-1/2 z-[2] hidden -translate-y-1/2 rounded-full bg-warm-cream/90 p-2 text-deep-maroon opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:block',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
