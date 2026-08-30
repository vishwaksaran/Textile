/**
 * Fixed choices for the structured product attributes.
 *
 * These are dropdowns in the admin rather than free text on purpose. Typed
 * into a description, the same care instruction arrives as "dry clean only",
 * "Dry Clean Only" and "dryclean" — which reads as three different things to
 * a customer scanning a spec table, and cannot be filtered on at all.
 *
 * Adding a value here is all it takes to offer it; the column is plain text,
 * so no migration is involved. Removing one does not corrupt products already
 * carrying it — they keep the value and simply cannot be re-selected to it,
 * which is the right behaviour for a weave the shop has stopped stocking.
 */

/** Cut lengths, in the way a customer at the counter would ask for them. */
export const PRODUCT_LENGTHS = [
  '5.5 metres',
  '6.0 metres',
  '6.3 metres (with blouse piece)',
  '6.5 metres (with blouse piece)',
  '9.0 metres (madisar)',
  '2.25 metres (blouse piece only)',
  '2.5 metres (churidar top)',
  '3.0 metres (churidar set with dupatta)',
] as const;

export const PRODUCT_FABRICS = [
  'Pure Mulberry Silk',
  'Kanchipuram Silk',
  'Banarasi Silk',
  'Tussar Silk',
  'Silk Cotton',
  'Khadi Cotton',
  'Handloom Cotton',
  'Chanderi',
  'Maheshwari',
  'Organza',
  'Georgette',
  'Crepe',
  'Linen',
  'Art Silk',
] as const;

export const PRODUCT_WASH_CARE = [
  'Dry clean only',
  'Dry clean recommended for the first wash',
  'Hand wash cold, separately',
  'Hand wash with mild detergent',
  'Machine wash gentle, cold water',
  'Do not bleach, wring or tumble dry',
] as const;

export type ProductLength = (typeof PRODUCT_LENGTHS)[number];
export type ProductFabric = (typeof PRODUCT_FABRICS)[number];
export type ProductWashCare = (typeof PRODUCT_WASH_CARE)[number];
