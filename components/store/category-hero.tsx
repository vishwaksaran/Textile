'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

/**
 * Full-bleed collection header with a parallax cover image.
 *
 * The parallax is deliberately cheap, because a listing page is not the place
 * to spend a frame budget:
 *
 *   - one passive scroll listener, coalesced into a single rAF, so a burst of
 *     scroll events produces at most one write per frame;
 *   - the only property touched is `transform`, which the compositor handles
 *     without layout or paint — animating `top` or `background-position` here
 *     would reflow the whole page on every frame;
 *   - it stops doing anything once the header has left the viewport, so
 *     scrolling the rest of a long grid costs nothing;
 *   - `prefers-reduced-motion` disables it outright rather than merely
 *     slowing it, and the layout is identical either way.
 *
 * The image sits in a frame 130% of the header's height, offset upwards, so
 * there is real headroom to move through. Translating an exactly-fitting
 * image would drag an empty edge into view.
 */
export function CategoryHero({
  name,
  description,
  imageUrl,
}: {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const image = imageRef.current;
    const frame = frameRef.current;
    if (!image || !frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frameId = 0;

    const apply = () => {
      frameId = 0;
      const rect = frame.getBoundingClientRect();
      // Nothing to do once it is fully above the viewport.
      if (rect.bottom < 0) return;

      // How far the header has travelled, 0 at rest and 1 when its top edge
      // reaches the top of the screen. Clamped so an over-scroll cannot push
      // the image past the headroom it has.
      const progress = Math.min(Math.max(-rect.top / rect.height, 0), 1);
      image.style.transform = `translate3d(0, ${(progress * 12).toFixed(2)}%, 0)`;
    };

    const onScroll = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header
      ref={frameRef}
      className="relative flex min-h-[420px] w-full items-center justify-center overflow-hidden md:min-h-[70vh]"
    >
      {imageUrl ? (
        <>
          <div
            ref={imageRef}
            // Taller than the frame and lifted, to give the parallax somewhere
            // to travel. will-change keeps it on its own compositor layer.
            className="absolute inset-x-0 -top-[15%] h-[130%] will-change-transform"
          >
            <Image
              src={imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover"
            />
          </div>
          {/* Graded, not a flat wash: the cloth stays readable at the top
              while the text below it keeps a dark ground to sit on. */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-deep-maroon via-deep-maroon/75 to-deep-maroon/20"
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-deep-maroon" aria-hidden="true" />
      )}

      <div className="relative mx-auto max-w-3xl px-margin-mobile py-16 text-center md:px-margin-desktop">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex justify-center gap-2 font-label-sm text-label-sm uppercase tracking-widest text-warm-cream/80"
        >
          <Link href="/" className="transition-colors hover:text-primary-fixed">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/collections" className="transition-colors hover:text-primary-fixed">
            Collections
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-bold text-primary-fixed">{name}</span>
        </nav>

        <h1 className="font-display-lg text-[34px] leading-tight text-warm-cream drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] md:text-[56px]">
          {name}
        </h1>

        {description && (
          <p className="mx-auto mt-5 max-w-2xl font-body-lg text-body-md text-warm-cream/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] md:text-body-lg">
            {description}
          </p>
        )}

        <span
          aria-hidden="true"
          className="mx-auto mt-8 block h-px w-24 bg-gradient-to-r from-transparent via-primary-container to-transparent"
        />
      </div>

      {/* Decorative, and animated in CSS so it costs nothing per frame. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center text-warm-cream/70 motion-safe:animate-bounce md:flex"
      >
        <span className="font-label-sm text-[10px] uppercase tracking-widest">Scroll</span>
        <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
      </div>
    </header>
  );
}
