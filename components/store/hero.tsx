'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { STORE } from '@/lib/config';
import { cn } from '@/lib/utils';

export interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** Where the copy sits, as percentages of the frame. Defaults to centred. */
  textX?: number;
  textY?: number;
  textAlign?: 'left' | 'center' | 'right';
  /** False when the artwork already carries its own lettering. */
  showText?: boolean;
  ctaHref: string;
}

const SLIDE_MS = 5000;

/**
 * Full-bleed hero: a sliding track of photographs under a dark scrim, with
 * white copy and a gold-bordered maroon call to action.
 *
 * Scrim note — the copy sits over arbitrary photography, so the overlay has
 * to guarantee contrast rather than rely on the picture being dark. A flat
 * black/30 (the usual choice) leaves white text at 2.1:1 over a bright
 * frame. Here a 0.35 base plus a 0.40 band behind the copy composites to
 * 0.61, giving white 6.0:1 and the gold eyebrow 4.65:1 against the brightest
 * pixel a photo can supply. Re-measure before lightening either layer.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (reduce || paused || slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [reduce, paused, slides.length]);

  return (
    <section
      className="relative h-[80vh] min-h-[520px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      {/* Exactly one h1 on the page, regardless of which slide is showing. */}
      <h1 className="sr-only">
        {STORE.name} — {STORE.tagline}
      </h1>

      {/*
        `willChange` promotes the track to its own compositor layer up front,
        so the slide runs on the GPU instead of repainting three full-bleed
        photographs on the main thread every frame.

        The curve leaves quickly and settles gently — the previous ease spent
        most of its time in a slow tail, which is what made the transition
        feel sluggish even though it was only 0.7s.
      */}
      <motion.div
        className="flex h-full w-full"
        style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
        animate={{ x: `-${index * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.62, ease: [0.32, 0.72, 0, 1] }}
      >
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.title}
              className="relative h-full w-full flex-shrink-0"
              aria-hidden={!active}
            >
              {/*
                Only the first slide is `priority` — it is the LCP element.

                The slide after the current one is promoted to `eager` while
                the current one is on screen, so it is decoded and ready
                before the track moves. That is the intermittent stutter:
                the transition arriving at a half-painted photograph, not the
                animation itself.

                Loading all three up front would fix it too, but at ~113KB
                each that is a quarter of a megabyte spent before anyone has
                scrolled. This way each image is fetched during the five
                seconds before it is needed, and costs nothing at first paint.
              */}
              <Image
                src={slide.image}
                alt=""
                fill
                priority={i === 0}
                loading={
                  i === 0 ? undefined : i === (index + 1) % slides.length ? 'eager' : 'lazy'
                }
                quality={82}
                sizes="100vw"
                className="object-cover"
              />

              {/* Base wash, then a band concentrated behind the copy. */}
              <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.40) 32%, rgba(0,0,0,0.40) 68%, rgba(0,0,0,0.12) 100%)',
                }}
              />

              {/* Positioned rather than centred: a banner supplied with its
                  own lettering needs the copy moved into the clear space
                  beside it, not printed over the top. */}
              {slide.showText !== false && (
              <div
                className="absolute px-margin-mobile"
                style={{
                  left: `${slide.textX ?? 50}%`,
                  top: `${slide.textY ?? 50}%`,
                  transform: 'translate(-50%, -50%)',
                  textAlign: slide.textAlign ?? 'center',
                  width: 'min(100%, 56rem)',
                }}
              >
                {/* The copy settles in as its slide arrives, and fades as it leaves. */}
                <motion.div
                  initial={false}
                  animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.45, delay: active ? 0.12 : 0, ease: [0.32, 0.72, 0, 1] }
                  }
                  className="flex flex-col"
                  style={{
                    alignItems:
                      slide.textAlign === 'left'
                        ? 'flex-start'
                        : slide.textAlign === 'right'
                          ? 'flex-end'
                          : 'center',
                  }}
                >
                  <p className="mb-4 font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary-fixed drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {slide.eyebrow}
                  </p>

                  <h2 className="mb-4 max-w-4xl font-display-lg text-display-lg-mobile text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] md:text-display-lg">
                    {slide.title}
                  </h2>

                  <p className="mb-8 max-w-2xl font-body-lg text-body-lg text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]">
                    {slide.body}
                  </p>

                  <Link
                    href={slide.ctaHref}
                    tabIndex={active ? undefined : -1}
                    className="rounded border border-primary-container/40 bg-deep-maroon px-8 py-4 font-label-lg text-label-lg uppercase tracking-wider text-primary-container shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] transition-colors duration-300 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                  >
                    {slide.ctaLabel}
                  </Link>
                </motion.div>
              </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center md:bottom-8">
          {slides.map((slide, i) => (
            /*
              The button is the touch target, the span is the dot. They have to
              be separate: a global rule gives every button a 44px minimum
              height on coarse pointers, which on a 12px round dot produces a
              tall bar rather than a circle.
            */
            <button
              key={slide.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}: ${slide.title}`}
              aria-current={i === index}
              className="group flex h-11 w-8 items-center justify-center focus-visible:outline-none"
            >
              <span
                className={cn(
                  // Active is both wider and gold, so the current slide is not
                  // signalled by colour alone.
                  'block h-2.5 rounded-full border border-white/40 transition-all duration-300',
                  i === index
                    ? 'w-6 bg-primary-container'
                    : 'w-2.5 bg-white/50 group-hover:bg-primary-container/70',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
