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
      /*
        Travel has to stay inside the headroom, and the two are measured
        against different boxes: the 8% offset is 8% of the *header*, while a
        percentage translate is of the *image frame*, which is 116% of it. At
        7% that worked out to 8.12% of the header — a hair more than the
        headroom — and the top edge lifted clear at full scroll, showing a
        line of background above the picture. 6% is 6.96%, inside it.
      */
      image.style.transform = `translate3d(0, ${(progress * 6).toFixed(2)}%, 0)`;
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
      className="hero-band relative flex w-full items-center justify-center overflow-hidden"
    >
      {imageUrl ? (
        <>
          <div
            ref={imageRef}
            /*
              Only 16% taller than the frame, not 30%.
              `object-cover` scales the image to fill this box, so every extra
              percent of headroom is a percent the picture is enlarged and
              therefore cropped — at 130% the subject was being pushed out of
              frame just to buy travel nobody asked for. 8% above and below is
              enough for the movement to read, and keeps the crop close to
              what the photograph actually is.
            */
            className="absolute inset-x-0 -top-[8%] h-[116%] will-change-transform"
          >
            <Image
              src={imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={90}
              // True centre, both axes: with the over-scale gone this holds
              // the middle of the photograph in the middle of the header.
              className="object-cover object-center"
            />
          </div>
          {/*
            Two layers rather than one heavy gradient.

            A single wash strong enough to carry the title at the bottom had to
            be near-opaque there, and on a short header — a phone, or a laptop
            in a 700px window — that opaque band is most of the picture. The
            shop pays for the photograph; it should be able to see it.

            So: a light overall veil that only knocks the contrast back, and a
            second gradient concentrated behind the copy. The text sits on the
            ground it needs and the cloth stays visible everywhere else, at any
            height.
          */}
          <div className="absolute inset-0 bg-deep-maroon/25" aria-hidden="true" />
          <div
            className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-deep-maroon/85 via-deep-maroon/45 to-transparent"
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
