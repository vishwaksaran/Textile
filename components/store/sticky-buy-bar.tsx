'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AddToCart } from '@/components/store/add-to-cart';
import { effectivePrice, formatINR } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Mobile-only buy bar. Appears once the inline add-to-cart scrolls out of
 * view, and sits above the bottom tab bar.
 */
export function StickyBuyBar({ product }: { product: Product }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const anchor = document.getElementById('buy-box');
    if (!anchor) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const soldOut = product.is_sold_out || product.stock_quantity <= 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed bottom-[60px] left-0 right-0 z-30 flex items-center gap-4 border-t border-primary-container/30 bg-warm-cream/95 px-margin-mobile py-3 backdrop-blur-md md:hidden"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-body-md text-xs text-on-surface-variant">{product.name}</p>
            <p className="font-headline-md text-[17px] text-deep-maroon">
              {formatINR(effectivePrice(product))}
            </p>
          </div>
          <div className="w-[52%]">
            <AddToCart product={product} compact />
          </div>
          {soldOut && <span className="sr-only">Sold out</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
