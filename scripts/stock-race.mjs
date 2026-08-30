#!/usr/bin/env node
/**
 * Fires concurrent purchases at one product to prove stock cannot be oversold.
 *
 *   npm run stock:race
 *
 * Creates its own inactive product, hammers `decrement_stock` from several
 * callers at once, then deletes it. Nothing in the real catalogue is touched
 * and the test product is never visible on the storefront (is_active = false).
 *
 * What it is checking: `decrement_stock` carries the guard
 *
 *     where id = p_product_id and stock_quantity >= p_qty
 *
 * inside the UPDATE. Postgres takes a row lock for the duration, so concurrent
 * callers queue rather than all reading "2 left" and all deciding they may
 * proceed. The loser matches zero rows and returns an empty set, which the
 * caller reads as "out of stock". Checking stock in application code first
 * would not survive this: two requests can both pass a SELECT before either
 * writes.
 */
import { readFileSync, existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

if (!url || !key) {
  console.error(RED('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'));
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const STOCK = 2;
const BUYERS = 6;
const WANTED = 2;

async function main() {
  // An inactive product, so it can never appear on the storefront even for
  // the second this runs.
  const created = await fetch(`${url}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      name: `ZZ race test ${Date.now()}`,
      price: 1000,
      stock_quantity: STOCK,
      is_active: false,
      is_sold_out: false,
    }),
  });
  const rows = await created.json();
  if (!created.ok || !rows[0]) {
    console.error(RED('Could not create the test product:'), JSON.stringify(rows).slice(0, 200));
    process.exit(1);
  }
  const id = rows[0].id;
  console.log(`\n  test product ${id.slice(0, 8)} created with ${STOCK} in stock`);
  console.log(`  ${BUYERS} buyers each try to take ${WANTED}, all at the same instant\n`);

  try {
    // No await inside the loop: every request goes out before any resolves,
    // which is the only way to actually contend for the row.
    const attempts = Array.from({ length: BUYERS }, (_, i) =>
      fetch(`${url}/rest/v1/rpc/decrement_stock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_product_id: id, p_qty: WANTED }),
      })
        .then(async (res) => ({ buyer: i + 1, ok: res.ok, body: await res.json() }))
        .catch((err) => ({ buyer: i + 1, ok: false, body: { error: err.message } })),
    );

    const results = await Promise.all(attempts);

    let winners = 0;
    for (const r of results) {
      const got = r.ok && Array.isArray(r.body) && r.body.length > 0;
      if (got) winners += 1;
      console.log(
        `    buyer ${r.buyer}  ${got ? GREEN('GOT IT ') : DIM('rejected')}` +
          (got ? DIM(`  stock now ${r.body[0].new_stock}`) : ''),
      );
    }

    const after = await (
      await fetch(`${url}/rest/v1/products?select=stock_quantity,is_sold_out&id=eq.${id}`, {
        headers,
      })
    ).json();
    const left = after[0]?.stock_quantity;

    const expectedWinners = Math.floor(STOCK / WANTED);
    console.log(`\n    winners        ${winners}   (expected ${expectedWinners})`);
    console.log(`    stock left     ${left}   (expected ${STOCK - winners * WANTED})`);
    console.log(`    sold out flag  ${after[0]?.is_sold_out}`);

    const ok = winners === expectedWinners && left === STOCK - winners * WANTED && left >= 0;
    console.log(
      ok
        ? GREEN('\n  PASS — exactly one buyer won and stock never went negative.\n')
        : RED('\n  FAIL — stock was oversold.\n'),
    );
    process.exitCode = ok ? 0 : 1;
  } finally {
    await fetch(`${url}/rest/v1/products?id=eq.${id}`, { method: 'DELETE', headers });
    console.log(DIM('  test product deleted\n'));
  }
}

main().catch((err) => {
  console.error(RED('Failed:'), err.message);
  process.exit(1);
});
