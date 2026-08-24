'use client';

import { motion } from 'framer-motion';
import { ProductCard } from '@/components/store/product-card';
import { staggerChildren } from '@/components/shared/motion';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

export function ProductGrid({
  products,
  className,
  columns = 4,
  priorityCount = 0,
}: {
  products: Product[];
  className?: string;
  columns?: 3 | 4;
  priorityCount?: number;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-outline-variant py-20 text-center">
        <p className="font-headline-md text-headline-md text-deep-maroon">Nothing here yet</p>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Try widening your filters — new weaves arrive every week.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="show"
      className={cn(
        'grid grid-cols-2 gap-4 sm:gap-gutter',
        columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < priorityCount} />
      ))}
    </motion.div>
  );
}
