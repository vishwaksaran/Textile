#!/usr/bin/env node
/**
 * Lists your WhatsApp message templates and their approval status, so you can
 * check without clicking through WhatsApp Manager.
 *
 *   npm run whatsapp:templates
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

const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
const version = (process.env.WHATSAPP_GRAPH_VERSION || 'v21.0').trim();
const wanted = (process.env.WHATSAPP_CONFIRM_TEMPLATE_NAME || 'order_confirmation').trim();
const shipped = (process.env.WHATSAPP_TEMPLATE_NAME || 'order_shipped_tracking').trim();

if (!token || !waba) {
  console.error(`\n${RED('✗')} WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID must both be set.\n`);
  process.exit(1);
}

const res = await fetch(
  `https://graph.facebook.com/${version}/${waba}/message_templates?limit=100&access_token=${encodeURIComponent(token)}`,
);
const json = await res.json();

if (json.error) {
  console.error(`\n${RED('✗')} ${json.error.message}\n`);
  process.exit(1);
}

const templates = json.data ?? [];
console.log(`\n  ${templates.length} template(s) on this WhatsApp Business account\n`);

const colour = (s) =>
  s === 'APPROVED' ? GREEN(s) : s === 'REJECTED' ? RED(s) : YELLOW(s);

for (const t of templates) {
  const params = (t.components ?? [])
    .filter((c) => c.type === 'BODY')
    .flatMap((c) => (c.text ?? '').match(/\{\{\d+\}\}/g) ?? []).length;
  console.log(
    `  ${t.name.padEnd(28)} ${String(t.language).padEnd(7)} ${String(t.category).padEnd(10)} ${colour(t.status)}` +
      DIM(`  ${params} placeholder${params === 1 ? '' : 's'}`),
  );
  if (t.status === 'REJECTED' && t.rejected_reason) {
    console.log(DIM(`      reason: ${t.rejected_reason}`));
  }
}

// The two this project actually sends.
console.log('');
for (const [name, label] of [[wanted, 'order confirmation'], [shipped, 'shipping update']]) {
  const found = templates.find((t) => t.name === name);
  if (!found) {
    console.log(`  ${RED('✗')} ${label}: no template named "${name}" — create it in WhatsApp Manager.`);
  } else if (found.status !== 'APPROVED') {
    console.log(`  ${YELLOW('•')} ${label}: "${name}" is ${found.status} — cannot send until APPROVED.`);
  } else {
    const expected = name === wanted ? 6 : 6;
    const params = (found.components ?? [])
      .filter((c) => c.type === 'BODY')
      .flatMap((c) => (c.text ?? '').match(/\{\{\d+\}\}/g) ?? []).length;
    const ok = params === expected;
    console.log(
      `  ${ok ? GREEN('✓') : RED('✗')} ${label}: "${name}" APPROVED with ${params} placeholders` +
        (ok ? '' : RED(` — this project sends ${expected}`)),
    );
  }
}
console.log('');
