'use client';

import { ImageGallery } from '@/components/store/image-gallery';
import { axesForProduct } from '@/components/store/variant-picker';
import { useActiveImages } from '@/stores/variant-store';
import type { Product } from '@/types';

/**
 * The gallery, following whichever option the shopper has picked.
 *
 * Colour is the one axis that changes the photographs, and a page that showed
 * green pictures while someone chose red would be worse than not offering the
 * choice at all. Which axis carries images is not assumed here: the shop
 * attaches them to a value, and the first chosen value that has any wins.
 *
 * A thin client wrapper so the product page itself stays a server component.
 */
export function ProductGallery({ product, dimmed }: { product: Product; dimmed?: boolean }) {
  const axes = axesForProduct(product.variants ?? [], product.variantAxes ?? []);
  const images = useActiveImages(product, product.optionDetails, axes);

  return <ImageGallery images={images} alt={product.name} dimmed={dimmed} />;
}
