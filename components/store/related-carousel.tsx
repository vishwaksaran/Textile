'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/store/product-card';
import type { Product } from '@/types';

/** Horizontally scrolling shelf — swipe on touch, arrow buttons on desktop. */
export function RelatedCarousel({ products }: { products: Product[] }) {
  const railRef = React.useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-headline-lg text-headline-lg italic text-deep-maroon">
          You May Also Love
        </h2>
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="rounded-full border border-outline-variant p-2 text-deep-maroon transition-colors hover:bg-primary-container/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="rounded-full border border-outline-variant p-2 text-deep-maroon transition-colors hover:bg-primary-container/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[65vw] flex-none snap-start sm:w-[42vw] md:w-[30vw] lg:w-[23%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
