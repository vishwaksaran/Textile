'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { QuickAdd } from '@/components/store/quick-add';
import { cn, discountPercent, effectivePrice, formatINR } from '@/lib/utils';
import { fadeUp } from '@/components/shared/motion';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const price = effectivePrice(product);
  const off = discountPercent(product);
  const soldOut = product.is_sold_out || product.stock_quantity <= 0;
  const low = !soldOut && product.stock_quantity <= 3;
  const image = product.images?.[0];

  return (
    <motion.article variants={fadeUp} className={cn('group h-full', className)}>
      {/* The card is a plain container: a button cannot live inside an anchor,
          so the link wraps only the image and copy. */}
      <div className="textile-card flex h-full flex-col rounded-lg bg-surface-container-lowest p-3 sm:p-4">
        <Link
          href={`/product/${product.id}`}
          prefetch={false}
          className="flex flex-1 flex-col rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2"
          aria-label={`${product.name}, ${formatINR(price)}${soldOut ? ', sold out' : ''}`}
        >
          <div className="textile-card-image-wrapper relative mb-4 aspect-[3/4] rounded bg-surface-variant/50">
            {image ? (
              <Image
                src={image}
                alt={product.name}
                fill
                priority={priority}
                quality={88}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={cn('object-cover', soldOut && 'opacity-60 saturate-[0.7]')}
              />
            ) : (
              <div className="flex h-full items-center justify-center font-body-md text-sm text-on-surface-variant/80">
                No image
              </div>
            )}

            <div className="absolute left-2 top-2 z-[2] flex flex-col items-start gap-1.5">
              {soldOut ? (
                <Badge variant="maroon">Sold Out</Badge>
              ) : off ? (
                <Badge variant="maroon">{off}% Off</Badge>
              ) : null}
              {low && <Badge variant="outline">Only {product.stock_quantity} left</Badge>}
            </div>
          </div>

          <div className="mt-auto space-y-1.5">
            {product.categories?.name && (
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
                {product.categories.name}
              </p>
            )}
            <h3 className="line-clamp-2 font-headline-md text-[18px] leading-tight text-deep-maroon sm:text-headline-md">
              {product.name}
            </h3>
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="font-body-md text-[17px] font-semibold tabular-nums text-deep-maroon">
                {formatINR(price)}
              </span>
              {off && (
                <span className="font-body-md text-sm text-on-surface-variant/80 line-through">
                  {formatINR(product.price)}
                </span>
              )}
            </p>
          </div>
        </Link>

        <QuickAdd product={product} className="mt-4" />
      </div>
    </motion.article>
  );
}
