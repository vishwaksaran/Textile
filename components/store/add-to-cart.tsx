'use client';

import * as React from 'react';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/store/quantity-selector';
import { VariantPicker, axesForProduct } from '@/components/store/variant-picker';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { useSelectedVariant } from '@/stores/variant-store';
import { cn, effectivePrice, formatINR } from '@/lib/utils';
import type { Product } from '@/types';

interface AddToCartProps {
  product: Product;
  /** Renders the compact bar used on the sticky mobile footer. */
  compact?: boolean;
  className?: string;
}

export function AddToCart({ product, compact = false, className }: AddToCartProps) {
  // Memoised together, because the fallback to an empty list is a fresh
  // array on every render and would rebuild the axes each time.
  const { variants, axes } = React.useMemo(() => {
    const rows = product.variants ?? [];
    return {
      variants: rows,
      // Derived from the variants themselves, so a piece stocked only in
      // green offers only green — not the shop's whole colour list struck
      // through.
      axes: axesForProduct(rows, product.variantAxes ?? []),
    };
  }, [product.variants, product.variantAxes]);
  const variant = useSelectedVariant(product.id, variants, axes);
  const { addToCart, pending, justAdded, soldOut, needsChoice, atLimit, inCart, ceiling, remaining } =
    useAddToCart(product, variant);

  /*
    Only the rows a shopper still has to answer. An axis offering one value
    is decided for them, so naming it in "Select colour and pattern" would
    point at something they cannot act on.
  */
  const openAxes = axes.filter((axis) => axis.values.length > 1);

  const [quantity, setQuantity] = React.useState(1);

  // A different size is a different shelf, so the stepper starts again rather
  // than carrying a quantity that the new size may not have.
  React.useEffect(() => setQuantity(1), [variant?.id]);

  // Never let the stepper offer more than is left after what is already in the
  // cart — the ceiling shrinks as the customer adds more.
  React.useEffect(() => {
    if (remaining > 0 && quantity > remaining) setQuantity(remaining);
  }, [remaining, quantity]);

  const disabled = soldOut || atLimit || pending;

  async function handleAdd() {
    // The compact bar has no room for the chips, so it sends the shopper up
    // to them instead of refusing with a message they cannot act on.
    if (needsChoice) {
      document.getElementById('buy-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const added = await addToCart(quantity);
    if (added) setQuantity(1);
  }

  if (compact) {
    return (
      <Button
        onClick={handleAdd}
        disabled={disabled && !needsChoice}
        shine={!disabled}
        className={cn('w-full', className)}
        size="lg"
        aria-live="polite"
      >
        {soldOut
          ? 'Sold Out'
          : needsChoice
            ? `Choose ${openAxes[0]?.name.toLowerCase() ?? 'an option'}`
            : pending
              ? 'Adding…'
              : atLimit
                ? `All ${ceiling} in cart`
                : `Add — ${formatINR((variant?.price ?? effectivePrice(product)) * quantity)}`}
      </Button>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {axes.length > 0 && (
        <VariantPicker
          productId={product.id}
          axes={axes}
          variants={variants}
          optionDetails={product.optionDetails ?? {}}
          basePrice={effectivePrice(product)}
          listPrice={product.discounted_price ? product.price : null}
        />
      )}

      {!soldOut && !atLimit && !needsChoice && (
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
        disabled={disabled || needsChoice}
        shine={!disabled && !needsChoice}
        size="lg"
        className="w-full"
        aria-live="polite"
      >
        {soldOut ? (
          'Sold Out'
        ) : needsChoice ? (
          `Select ${openAxes.map((a) => a.name.toLowerCase()).join(' and ')}`
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
          {variants.length > 0
            ? 'Every option is spoken for. Write to us and we will tell you when this is back.'
            : 'This weave is between looms. Write to us and we will tell you when the next one is ready.'}
        </p>
      )}
    </div>
  );
}
