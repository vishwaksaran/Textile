'use client';

import { ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore, selectCount } from '@/stores/cart-store';
import { cn } from '@/lib/utils';

/** Bag icon with a live item count that pops when the count changes. */
export function CartButton({
  className,
  showLabel = false,
}: {
  className?: string;
  /** Renders the word "Cart" beside the icon, for the desktop nav row. */
  showLabel?: boolean;
}) {
  const open = useCartStore((s) => s.open);
  const hydrated = useCartStore((s) => s.hydrated);
  const count = useCartStore(selectCount);

  return (
    <button
      type="button"
      onClick={open}
      aria-label={count > 0 ? `Open cart, ${count} items` : 'Open cart'}
      className={cn(
        'relative rounded text-deep-maroon transition-transform duration-200 hover:opacity-80 active:scale-90 motion-reduce:active:scale-100',
        showLabel
          ? 'text-on-surface-variant hover:text-deep-maroon'
          : 'p-2',
        className,
      )}
    >
      <span className="relative">
        <ShoppingBag className={showLabel ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={1.5} />
        <AnimatePresence>
          {hydrated && count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              className={cn(
                'absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 font-label-sm text-[10px] leading-none text-deep-maroon',
                showLabel ? '-right-2 -top-2' : '-right-1.5 -top-1.5',
              )}
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {showLabel && 'Cart'}
    </button>
  );
}
