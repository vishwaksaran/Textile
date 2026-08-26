#!/usr/bin/env node
/**
 * Sends a real WhatsApp template so you can prove the setup works before a
 * customer depends on it.
 *
 *   npm run whatsapp:test -- 9789467448
 *
 * Meta's failures are famously opaque, so the common ones are decoded below.
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
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const template = (process.env.WHATSAPP_CONFIRM_TEMPLATE_NAME || 'order_confirmation').trim();
const lang = (process.env.WHATSAPP_TEMPLATE_LANG || 'en').trim();
const version = (process.env.WHATSAPP_GRAPH_VERSION || 'v21.0').trim();

const raw = (process.argv[2] ?? '').replace(/\D/g, '');
const to = raw.length === 10 ? `91${raw}` : raw;

function die(msg, hint) {
  console.error(`\n${RED('✗')} ${msg}`);
  if (hint) console.error(DIM(`  ${hint}`));
  console.error('');
  process.exit(1);
}

if (!token) die('WHATSAPP_ACCESS_TOKEN is not set.', 'Meta app -> WhatsApp -> API Setup.');
if (!phoneId) die('WHATSAPP_PHONE_NUMBER_ID is not set.', 'Same page — it is the "Phone number ID", not the number itself.');
if (!to) die('No recipient.', 'npm run whatsapp:test -- 9789467448');

console.log(`\n  template: ${template} (${lang})`);
console.log(`  to:       +${to}\n`);

const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: lang },
      // The same five parameters the app sends, in the same order.
      components: [
        {
          type: 'body',
          parameters: [
            'Test', 'TEST1234', 'Silk saree x1', 'Rs. 1', 'https://srilaxmisilks.com/track',
          ].map((text) => ({ type: 'text', text })),
        },
      ],
    },
  }),
});

const json = await res.json().catch(() => ({}));

if (res.ok) {
  console.log(`${GREEN('✓')} Sent. Message id: ${json?.messages?.[0]?.id ?? '(none returned)'}`);
  console.log(DIM('  Check the phone. If nothing arrives, the number is probably not on\n  the test allow-list (Meta app -> WhatsApp -> API Setup -> recipients).\n'));
  process.exit(0);
}

const message = json?.error?.message ?? `HTTP ${res.status}`;
const code = json?.error?.code;
console.error(`${RED('✗')} Meta refused it: ${message}${code ? DIM(`  (code ${code})`) : ''}`);

const hints = [
  [/expired|session has expired|OAuthException/i,
   'Your token has expired. The token on the API Setup page lasts 24 hours.\n  For production create a permanent System User token in Business Settings.'],
  [/template name does not exist|does not exist in the translation/i,
   `No approved template called "${template}" in language "${lang}".\n  Check the exact name and language in WhatsApp Manager -> Message Templates.\n  A template still under review cannot be sent.`],
  [/number of parameters|param.*mismatch|expected/i,
   'The template expects a different number of {{n}} placeholders.\n  This project sends five: name, order id, items, total, tracking url.'],
  [/not.*allowed.*recipient|recipient phone number not in|131030/i,
   'That number is not on the test allow-list. Add it under\n  WhatsApp -> API Setup -> "To" -> Manage phone number list.'],
  [/Unsupported post request|does not exist/i,
   'The phone number ID looks wrong. Copy "Phone number ID" from API Setup,\n  not the phone number itself.'],
];
for (const [re, hint] of hints) {
  if (re.test(message)) { console.error(DIM(`\n  ${hint}`)); break; }
}
console.error('');
process.exit(1);
