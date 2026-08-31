'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { lineKey, useCartStore } from '@/stores/cart-store';
import { COMMERCE } from '@/lib/config';
import { effectivePrice, formatINR } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

/**
 * The single add-to-cart code path, shared by the product page and the grid's
 * quick-add so the stock rules can never drift apart.
 *
 * A product with variants is only addable once every axis has an answer:
 * `variant` carries the combination, and `needsChoice` is how the grid's
 * quick-add knows to send the shopper to the product page rather than
 * guessing which colour or size they meant.
 *
 * Stock is enforced in three places, deliberately:
 *   1. here, against a live server read, so a cached grid cannot oversell;
 *   2. in the cart store, which clamps to `maxStock` on every mutation;
 *   3. in /api/razorpay/create-order, which re-prices from the database.
 * Only the third is authoritative — the first two exist to keep the customer
 * from ever reaching a checkout that will reject them.
 */
export function useAddToCart(product: Product, variant?: ProductVariant | null) {
  const add = useCartStore((s) => s.add);
  const openCart = useCartStore((s) => s.open);
  const hydrated = useCartStore((s) => s.hydrated);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const variantId = variant?.id ?? null;
  const key = lineKey(product.id, variantId);
  const cartItem = useCartStore((s) =>
    s.items.find((i) => lineKey(i.productId, i.variantId) === key),
  );
  const inCart = cartItem?.quantity ?? 0;

  /** Has combinations, none fully chosen. Not an error — just not addable. */
  const needsChoice = (product.variants ?? []).length > 0 && !variant;

  const [pending, setPending] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => () => clearTimeout(timer.current), []);

  /*
    A chosen combination answers for itself; without one the product's own
    total does, and that total is the sum of the combinations, so a churidar
    with every one at zero still reads as sold out on the grid.
  */
  const shelf = variant ? variant.stock_quantity : product.stock_quantity;
  const soldOut = variant ? shelf <= 0 : product.is_sold_out || shelf <= 0;

  /**
   * Never offer more than the shelf holds, or more than the per-order cap.
   * The row already in the cart carries the stock level from its own live
   * check, so prefer that over this page's possibly-cached figure.
   */
  const ceiling = Math.max(
    Math.min(cartItem?.maxStock ?? shelf, COMMERCE.maxQuantityPerItem),
    0,
  );
  /** Only trustworthy once the persisted cart has rehydrated. */
  const atLimit = hydrated && !soldOut && inCart >= ceiling;
  const remaining = Math.max(ceiling - inCart, 0);

  /** Stepper edits. The store clamps to the row's own maxStock as well. */
  const changeQuantity = React.useCallback(
    (next: number) => setQuantity(key, Math.min(Math.max(next, 0), ceiling)),
    [setQuantity, key, ceiling],
  );

  const addToCart = React.useCallback(
    async (quantity = 1): Promise<boolean> => {
      if (soldOut || pending) return false;
      if (needsChoice) {
        toast.error('Choose an option first');
        return false;
      }

      setPending(true);
      try {
        // Re-read stock so two tabs, or a cached page, cannot oversell.
        const res = await fetch(`/api/products/${product.id}/stock`, { cache: 'no-store' });
        const live = res.ok ? await res.json() : null;

        if (res.status === 404) {
          toast.error('No longer available', {
            description: 'This piece has been withdrawn from the collection.',
          });
          return false;
        }

        // The live row for the size in hand, when there is one. A size the
        // shop retired mid-visit is simply absent, which reads as sold out.
        const liveVariant: { stock_quantity: number; price: number } | undefined = variantId
          ? live?.variants?.find((v: { id: string }) => v.id === variantId)
          : undefined;

        const stock: number = variantId
          ? (liveVariant?.stock_quantity ?? 0)
          : (live?.stock_quantity ?? product.stock_quantity);

        if (stock <= 0) {
          toast.error('Just sold out', {
            description: variant
              ? `${variant.label} was taken while you were browsing.`
              : 'This piece was taken while you were browsing.',
          });
          return false;
        }

        const price: number =
          liveVariant?.price ?? live?.price ?? variant?.price ?? effectivePrice(product);
        const result = add(
          {
            productId: product.id,
            variantId,
            variantLabel: variant?.label ?? null,
            name: product.name,
            slug: product.categories?.slug ?? '',
            image: product.images?.[0] ?? null,
            price,
            originalPrice: product.discounted_price ? product.price : null,
            maxStock: stock,
          },
          quantity,
        );

        if (!result.ok) {
          toast.error(result.reason ?? 'Could not add to cart');
          return false;
        }

        setJustAdded(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setJustAdded(false), 1600);

        toast.success('Added to your cart', {
          description:
            result.reason ??
            `${product.name}${variant ? ` · ${variant.label}` : ''} — ${formatINR(price * quantity)}`,
          action: { label: 'View cart', onClick: openCart },
        });
        return true;
      } catch {
        toast.error('Network hiccup', { description: 'Please try adding that again.' });
        return false;
      } finally {
        setPending(false);
      }
    },
    [add, openCart, pending, product, soldOut, needsChoice, variant, variantId],
  );

  return {
    addToCart,
    changeQuantity,
    pending,
    justAdded,
    soldOut,
    needsChoice,
    atLimit,
    inCart,
    ceiling,
    remaining,
    hydrated,
  };
}
