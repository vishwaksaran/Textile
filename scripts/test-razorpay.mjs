#!/usr/bin/env node
/**
 * Proves the Razorpay keys work by creating a real ₹1 order against their API,
 * so you find out now rather than when a customer is at checkout.
 *
 *   npm run razorpay:test
 *
 * Creating an order costs nothing — no money moves until a payment is made
 * against it, and this script never does that.
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

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

function die(msg, hint) {
  console.error(`\n${RED('✗')} ${msg}`);
  if (hint) console.error(DIM(`  ${hint}`));
  console.error('');
  process.exit(1);
}

if (!keyId) die('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set.', 'Razorpay Dashboard -> Settings -> API Keys.');
if (!keySecret) die('RAZORPAY_KEY_SECRET is not set.', 'Shown once, when you generate the key.');

const mode = keyId.startsWith('rzp_live_')
  ? 'LIVE'
  : keyId.startsWith('rzp_test_')
    ? 'TEST'
    : 'UNKNOWN';

console.log(`\n  key id: ${keyId}`);
console.log(`  mode:   ${mode === 'LIVE' ? RED('LIVE — real money') : mode === 'TEST' ? GREEN('TEST') : YELLOW(mode)}`);
console.log(`  webhook secret: ${webhookSecret ? GREEN('set') : YELLOW('not set — the fallback confirmation path is off')}\n`);

if (mode === 'UNKNOWN') {
  console.log(YELLOW('  Key ids normally start rzp_test_ or rzp_live_. Check it was pasted whole.\n'));
}

const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
const res = await fetch('https://api.razorpay.com/v1/orders', {
  method: 'POST',
  headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100, // paise — ₹1
    currency: 'INR',
    receipt: `setup_check_${Date.now()}`,
    notes: { purpose: 'Credential check from npm run razorpay:test' },
  }),
});

const json = await res.json().catch(() => ({}));

if (res.ok) {
  console.log(`${GREEN('✓')} Razorpay accepted the credentials.`);
  console.log(DIM(`  Created order ${json.id} for ₹${(json.amount / 100).toFixed(2)} (${json.status}).`));
  console.log(DIM('  No money has moved — an order is just an intent to charge.\n'));
  if (mode === 'LIVE') {
    console.log(YELLOW('  These are LIVE keys. Real cards will be charged at checkout.\n'));
  }
  process.exit(0);
}

const message = json?.error?.description ?? `HTTP ${res.status}`;
console.error(`${RED('✗')} Razorpay refused: ${message}`);

const hints = [
  [/authentication|unauthorized|401/i,
   'The key id and secret do not match. They are issued as a pair — regenerating\n  the secret invalidates the old one. Copy both from the same generation.'],
  [/not activated|activation/i,
   'The account is not activated for live payments yet. Complete KYC in the\n  dashboard, or use rzp_test_ keys until it clears.'],
  [/amount/i,
   'Razorpay works in paise. This project converts with toPaise() in lib/razorpay.ts.'],
];
for (const [re, hint] of hints) {
  if (re.test(message)) { console.error(DIM(`\n  ${hint}`)); break; }
}
console.error('');
process.exit(1);
