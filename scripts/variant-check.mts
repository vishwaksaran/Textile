/**
 * Checks that sizes did not change what a saree does.
 *
 *   npm run variants:check
 *
 * Everything in stage 5 is additive, and the claim that makes it safe to
 * deploy to a shop taking live orders is that a product with no sizes takes
 * exactly the path it took before. This proves the two pure pieces that claim
 * rests on: how a cart line is identified, and how a cart saved before sizes
 * existed is read back.
 */
import { lineKey } from '../stores/cart-store';
import type { CartItem } from '../types';

const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? GREEN('ok  ') : RED('FAIL')} ${name}${detail ? DIM(`  ${detail}`) : ''}`);
};

const P = 'p0000000-0000-4000-8000-000000000001';
const Q = 'p0000000-0000-4000-8000-000000000002';

console.log('\nLine identity\n');

check('a sizeless line keys on the product alone', lineKey(P, null) === P, lineKey(P, null));
check('undefined is treated as null', lineKey(P, undefined) === P);
check('a sized line keys on both', lineKey(P, 'v1') === `${P}:v1`, lineKey(P, 'v1'));
check('two sizes of one piece are two lines', lineKey(P, 'v1') !== lineKey(P, 'v2'));
check('one size of two pieces are two lines', lineKey(P, 'v1') !== lineKey(Q, 'v1'));
check(
  'a sized line never collides with a sizeless one',
  lineKey(P, 'v1') !== lineKey(P, null) && lineKey(P, 'v1') !== lineKey(Q, null),
);

console.log('\nCarts saved before sizes existed\n');

/*
  The store's own migrate function, which zustand runs on rehydrate when the
  persisted version is older than the current one. Copied by shape rather than
  imported, because importing the store pulls in localStorage.
*/
const migrate = (persisted: unknown) => {
  const state = persisted as { items?: Partial<CartItem>[] } | undefined;
  return {
    items: (state?.items ?? []).map((i) => ({
      ...i,
      variantId: i.variantId ?? null,
      variantLabel: i.variantLabel ?? null,
    })),
  };
};

const old = {
  items: [
    { productId: P, name: 'Kanchipuram', price: 12000, quantity: 1, maxStock: 3 },
    { productId: Q, name: 'Banarasi', price: 9000, quantity: 2, maxStock: 5 },
  ],
};

const migrated = migrate(old);

check('every old line survives', migrated.items.length === 2);
check(
  'every old line gains a null size',
  migrated.items.every((i) => i.variantId === null && i.variantLabel === null),
);
check(
  'old lines key exactly as they did before',
  migrated.items.map((i) => lineKey(i.productId!, i.variantId)).join(',') === `${P},${Q}`,
);
check('quantities are untouched', migrated.items.map((i) => i.quantity).join(',') === '1,2');
check('an empty cart migrates to an empty cart', migrate({ items: [] }).items.length === 0);
check('a missing cart migrates to an empty cart', migrate(undefined).items.length === 0);

console.log('\nStock reconciliation keys\n');

/*
  getStockLevels emits one entry per product and one per size, keyed the way
  the cart keys its lines. A cart holding an M and an L must find two
  different shelves, not the same total twice.
*/
const levels: Record<string, { stock: number }> = {
  [P]: { stock: 5 },
  [`${P}:v1`]: { stock: 2 },
  [`${P}:v2`]: { stock: 3 },
};

check('a sizeless line reads the product total', levels[lineKey(P, null)]?.stock === 5);
check('the M reads its own shelf', levels[lineKey(P, 'v1')]?.stock === 2);
check('the L reads its own shelf', levels[lineKey(P, 'v2')]?.stock === 3);
check(
  'a size that has gone reads as absent, not as the total',
  levels[lineKey(P, 'v9')] === undefined,
);

console.log(
  failed === 0
    ? `\n${GREEN('All checks passed.')} Sizeless lines behave exactly as before.\n`
    : `\n${RED(`${failed} check(s) failed.`)}\n`,
);

process.exit(failed === 0 ? 0 : 1);
