#!/usr/bin/env node
/**
 * Sends a real test email through Resend, so you can prove the setup works
 * without placing a fake order.
 *
 *   npm run email:test -- you@yourstore.com
 *   npm run email:test                        # falls back to ADMIN_EMAIL
 */
import { Resend } from 'resend';
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
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.RESEND_FROM?.trim();
// Same resolution order the app uses, so a passing test means the real
// alerts will land in the same inbox.
const to = (
  process.argv[2] ??
  process.env.ORDER_ALERT_EMAIL ??
  process.env.ADMIN_EMAIL ??
  ''
)
  .split(',')[0]
  .trim();

if (!apiKey) {
  console.error(`\n${RED('✗')} RESEND_API_KEY is not set in .env.local.`);
  console.error(DIM('  Create one at https://resend.com/api-keys — see docs/SETUP.md §5.\n'));
  process.exit(1);
}
if (!from) {
  console.error(`\n${RED('✗')} RESEND_FROM is not set.`);
  console.error(DIM('  e.g. RESEND_FROM="Sri Laxmi Silks <orders@srilaxmisilks.com>"\n'));
  process.exit(1);
}
if (!to) {
  console.error(`\n${RED('✗')} No recipient. Pass one, or set ORDER_ALERT_EMAIL.`);
  console.error(DIM('  npm run email:test -- you@yourstore.com\n'));
  process.exit(1);
}

console.log(`\n  from: ${from}`);
console.log(`  to:   ${to}\n`);

const { data, error } = await new Resend(apiKey).emails.send({
  from,
  to,
  subject: 'Test — Sri Laxmi Silks email is working',
  html: `<div style="font-family:Georgia,serif;color:#4A0404">
      <h1 style="font-size:20px;margin:0 0 12px">Email is wired up correctly.</h1>
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#4d4635;line-height:1.6">
        If you are reading this, order confirmations will reach your customers:
        their order ID, the invoice PDF attached, and a Track this order button.
      </p>
    </div>`,
});

if (error) {
  console.error(`${RED('✗')} Resend refused it: ${error.message}`);
  if (/domain is not verified|not verified/i.test(error.message ?? '')) {
    console.error(
      DIM('\n  The domain in RESEND_FROM is not verified yet. Either finish verification\n' +
          '  at https://resend.com/domains, or use onboarding@resend.dev while testing.\n'),
    );
  }
  process.exit(1);
}

console.log(`${GREEN('✓')} Sent. Resend id: ${data.id}`);
console.log(DIM('  Check the inbox (and the spam folder on a first send).\n'));
