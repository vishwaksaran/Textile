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

      <motion.div
        className="flex h-full w-full"
        animate={{ x: `-${index * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.title}
              className="relative h-full w-full flex-shrink-0"
              aria-hidden={!active}
            >
              <Image
                src={slide.image}
                alt=""
                fill
                priority={i === 0}
                quality={90}
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

              <div className="absolute inset-0 flex flex-col items-center justify-center px-margin-mobile text-center">
                {/* The copy settles in as its slide arrives, and fades as it leaves. */}
                <motion.div
                  initial={false}
                  animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.55, delay: active ? 0.2 : 0, ease: [0.4, 0, 0.2, 1] }
                  }
                  className="flex flex-col items-center"
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
