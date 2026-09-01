/**
 * Checks that variants did not change what a saree does.
 *
 *   npm run variants:check
 *
 * The claim that makes this safe to deploy to a shop taking live orders is
 * that a product with no variants takes exactly the path it took before. This
 * proves the pure pieces that claim rests on: how a combination is
 * identified, how a cart line is keyed, and how a cart saved before any of it
 * existed is read back.
 */
import { lineKey } from '../stores/cart-store';
import { axesForProduct, optionKey, variantLabel } from '../lib/variant-key';
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

console.log('\nNaming a combination\n');

/*
  The browser resolves a shopper's selection to a variant by rebuilding the
  key the server wrote. If the two ever disagreed, the first anyone would hear
  of it is a shopper unable to add a size that is plainly in stock.
*/
check(
  'a combination is one normalised string',
  optionKey({ colour: 'Green', size: 'M' }) === 'colour:green|size:m',
  optionKey({ colour: 'Green', size: 'M' }),
);
check(
  'the order the form filled it in does not matter',
  optionKey({ size: 'M', colour: 'Green' }) === optionKey({ colour: 'Green', size: 'M' }),
);
check(
  'case and stray spaces do not make a second combination',
  optionKey({ colour: ' green ', size: 'm' }) === optionKey({ colour: 'Green', size: 'M' }),
);
check(
  'different combinations stay different',
  optionKey({ colour: 'Green', size: 'M' }) !== optionKey({ colour: 'Green', size: 'L' }),
);
check('one axis still works', optionKey({ size: 'M' }) === 'size:m');
check('no axes is the empty key', optionKey({}) === '');
check(
  'an empty value is not part of the combination',
  optionKey({ colour: 'Green', size: '  ' }) === 'colour:green',
);

check(
  'the label reads in the order the shop lists its axes',
  variantLabel({ size: 'M', colour: 'Green' }, ['colour', 'size']) === 'Green / M',
  variantLabel({ size: 'M', colour: 'Green' }, ['colour', 'size']),
);
check(
  'an axis the piece does not use is left out',
  variantLabel({ size: 'M' }, ['colour', 'size']) === 'M',
);

console.log('\nLine identity\n');

check('a variantless line keys on the product alone', lineKey(P, null) === P, lineKey(P, null));
check('undefined is treated as null', lineKey(P, undefined) === P);
check('a variant line keys on both', lineKey(P, 'v1') === `${P}:v1`);
check('two combinations of one piece are two lines', lineKey(P, 'v1') !== lineKey(P, 'v2'));
check('one combination of two pieces are two lines', lineKey(P, 'v1') !== lineKey(Q, 'v1'));
check(
  'a variant line never collides with a variantless one',
  lineKey(P, 'v1') !== lineKey(P, null) && lineKey(P, 'v1') !== lineKey(Q, null),
);

console.log('\nCarts saved before variants existed\n');

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
  'every old line gains a null variant',
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
  getStockLevels emits one entry per product and one per variant, keyed the
  way the cart keys its lines. A cart holding a Green M and a Red M must find
  two different shelves, not the same total twice.
*/
const levels: Record<string, { stock: number }> = {
  [P]: { stock: 5 },
  [`${P}:v1`]: { stock: 2 },
  [`${P}:v2`]: { stock: 3 },
};

check('a variantless line reads the product total', levels[lineKey(P, null)]?.stock === 5);
check('Green / M reads its own shelf', levels[lineKey(P, 'v1')]?.stock === 2);
check('Red / M reads its own shelf', levels[lineKey(P, 'v2')]?.stock === 3);
check(
  'a combination that has gone reads as absent, not as the total',
  levels[lineKey(P, 'v9')] === undefined,
);

console.log('\nHow the chips are ordered\n');

/*
  A variant's sort_order describes the combination, not the size, so the chips
  have to follow the attribute's own option order instead. Without that a size
  row comes out in whatever order the grid created the rows — the
  "M, XL, XXL, L" a shopper was shown before this was fixed.
*/
const V = (options: Record<string, string>, sort: number) => ({
  id: Object.values(options).join('-'),
  product_id: P,
  label: Object.values(options).join(' / '),
  option_key: optionKey(options),
  options,
  sku: null,
  stock_quantity: 1,
  price: null,
  images: [] as string[],
  sort_order: sort,
  is_active: true,
});

// Deliberately entered out of order, as a grid built colour-first would.
const jumbled = [
  V({ size: 'M' }, 10),
  V({ size: 'XL' }, 20),
  V({ size: 'XXL' }, 30),
  V({ size: 'L' }, 40),
];
const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const sized = (variants: typeof jumbled, order: string[]) =>
  axesForProduct(variants, [{ slug: 'size', name: 'Size', order }])[0]?.values.join(', ') ?? '';

check(
  'sizes run the way the shop lists them, not the way they were typed',
  sized(jumbled, sizeOrder) === 'M, L, XL, XXL',
  sized(jumbled, sizeOrder),
);
check(
  'a size typed by hand sorts after the listed ones, not before',
  sized([...jumbled, V({ size: '3XL' }, 50)], sizeOrder) === 'M, L, XL, XXL, 3XL',
  sized([...jumbled, V({ size: '3XL' }, 50)], sizeOrder),
);
check(
  'with no listed order, values fall back to a natural sort',
  sized(jumbled, []) === 'L, M, XL, XXL',
  sized(jumbled, []),
);
check(
  'an axis the piece does not stock is dropped, not shown empty',
  axesForProduct(jumbled, [
    { slug: 'colour', name: 'Colour', order: [] },
    { slug: 'size', name: 'Size', order: sizeOrder },
  ])
    .map((a) => a.slug)
    .join(',') === 'size',
);

console.log('\nWhich chips a shopper can still press\n');

/*
  The picker's reachability rule, which decides whether a chip is struck
  through. Its own axis is excluded from the test, so clicking a sold-out
  colour does not require first clearing the size.
*/
type Row = { options: Record<string, string>; stock: number };
const stock: Row[] = [
  { options: { colour: 'Green', size: 'M' }, stock: 2 },
  { options: { colour: 'Green', size: 'L' }, stock: 0 },
  { options: { colour: 'Red', size: 'M' }, stock: 0 },
  { options: { colour: 'Red', size: 'L' }, stock: 4 },
];
const slugs = ['colour', 'size'];

const reachable = (slug: string, value: string, selected: Record<string, string>) =>
  stock.some(
    (row) =>
      row.stock > 0 &&
      row.options[slug] === value &&
      slugs.every(
        (other) => other === slug || !selected[other] || row.options[other] === selected[other],
      ),
  );

check('with nothing chosen, both colours are open', reachable('colour', 'Green', {}) && reachable('colour', 'Red', {}));
check('with M chosen, Green is open', reachable('colour', 'Green', { size: 'M' }));
check('with M chosen, Red is struck through', !reachable('colour', 'Red', { size: 'M' }));
check('with Green chosen, L is struck through', !reachable('size', 'L', { colour: 'Green' }));
check('with Red chosen, L is open again', reachable('size', 'L', { colour: 'Red' }));
check(
  'a colour is judged on its own merits, not the size already picked',
  reachable('colour', 'Red', { colour: 'Green', size: 'M' }) === false &&
    reachable('size', 'L', { colour: 'Red', size: 'M' }) === true,
);

console.log(
  failed === 0
    ? `\n${GREEN('All checks passed.')} Variantless lines behave exactly as before.\n`
    : `\n${RED(`${failed} check(s) failed.`)}\n`,
);

process.exit(failed === 0 ? 0 : 1);
