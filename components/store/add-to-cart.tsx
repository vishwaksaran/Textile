'use client';

import * as React from 'react';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/store/quantity-selector';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { cn, effectivePrice, formatINR } from '@/lib/utils';
import type { Product } from '@/types';

interface AddToCartProps {
  product: Product;
  /** Renders the compact bar used on the sticky mobile footer. */
  compact?: boolean;
  className?: string;
}

export function AddToCart({ product, compact = false, className }: AddToCartProps) {
  const { addToCart, pending, justAdded, soldOut, atLimit, inCart, ceiling, remaining } =
    useAddToCart(product);

  const [quantity, setQuantity] = React.useState(1);

  // Never let the stepper offer more than is left after what is already in the
  // cart — the ceiling shrinks as the customer adds more.
  React.useEffect(() => {
    if (remaining > 0 && quantity > remaining) setQuantity(remaining);
  }, [remaining, quantity]);

  const disabled = soldOut || atLimit || pending;

  async function handleAdd() {
    const added = await addToCart(quantity);
    if (added) setQuantity(1);
  }

  if (compact) {
    return (
      <Button
        onClick={handleAdd}
        disabled={disabled}
        shine={!disabled}
        className={cn('w-full', className)}
        size="lg"
        aria-live="polite"
      >
        {soldOut
          ? 'Sold Out'
          : pending
            ? 'Adding…'
            : atLimit
              ? `All ${ceiling} in cart`
              : `Add — ${formatINR(effectivePrice(product) * quantity)}`}
      </Button>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {!soldOut && !atLimit && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
            Quantity
          </span>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={Math.max(remaining, 1)}
          />
          {inCart > 0 && (
            <span className="font-body-md text-sm text-on-surface-variant">
              {inCart} already in your cart
            </span>
          )}
        </div>
      )}

      <Button
        onClick={handleAdd}
        disabled={disabled}
        shine={!disabled}
        size="lg"
        className="w-full"
        aria-live="polite"
      >
        {soldOut ? (
          'Sold Out'
        ) : pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Adding…
          </>
        ) : justAdded ? (
          <>
            <Check className="h-4 w-4" /> Added to cart
          </>
        ) : atLimit ? (
          `All ${ceiling} in your cart`
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" /> Add to cart
          </>
        )}
      </Button>

      {atLimit && !soldOut && (
        <p className="text-center font-body-md text-sm text-on-surface-variant">
          {ceiling < product.stock_quantity
            ? `We limit orders to ${ceiling} of one piece. Write to us for a larger order.`
            : `That is every one we have. Adjust the quantity in your cart if you need fewer.`}
        </p>
      )}

      {soldOut && (
        <p className="text-center font-body-md text-sm text-on-surface-variant">
          This weave is between looms. Write to us and we will tell you when the next one is ready.
        </p>
      )}
    </div>
  );
}
