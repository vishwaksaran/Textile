'use client';

import { Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/store/quantity-selector';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Card buy control. Starts as a single button, then becomes a −/+ stepper
 * once the piece is in the cart. Always visible rather than hover-only, since
 * a hover-gated control is unreachable on touch.
 */
export function QuickAdd({ product, className }: { product: Product; className?: string }) {
  const { addToCart, changeQuantity, pending, soldOut, atLimit, inCart, ceiling, hydrated } =
    useAddToCart(product);

  // Before rehydration the cart count is unknown, so render the neutral
  // button rather than flashing a stepper with the wrong number in it.
  const showStepper = hydrated && inCart > 0 && !soldOut;

  if (showStepper) {
    return (
      <div className={cn('space-y-1', className)}>
        <QuantitySelector
          value={inCart}
          onChange={changeQuantity}
          min={0}
          max={ceiling}
          size="sm"
          removeAtMin
          label={`Quantity of ${product.name} in your cart`}
          className="w-full justify-between"
        />
        {atLimit && (
          <p className="text-center font-body-md text-[11px] text-earthy-bronze">
            {ceiling < product.stock_quantity
              ? `Limit ${ceiling} per order`
              : `That is all ${ceiling} we have`}
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('w-full', className)}
      disabled={soldOut || pending}
      aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
      onClick={(e) => {
        // The card behind this control is a link.
        e.preventDefault();
        e.stopPropagation();
        void addToCart(1);
      }}
    >
      {soldOut ? (
        'Sold Out'
      ) : pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Adding…
        </>
      ) : (
        <>
          <ShoppingBag className="h-3.5 w-3.5" />
          Add to cart
        </>
      )}
    </Button>
  );
}
