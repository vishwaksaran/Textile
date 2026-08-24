#!/usr/bin/env node
/**
 * Creates (or repairs) an admin login.
 *
 *   npm run admin:create -- --email you@example.com --password "secret" --name "Your Name"
 *   npm run admin:create            # prompts for anything missing
 *   npm run admin:list              # shows who currently has access
 *
 * An admin is two linked records: a Supabase Auth user, and a row in the
 * `admins` table whose id equals that user's id. The RLS policies compare
 * auth.uid() against admins.id, so a row with a mismatched id grants nothing.
 * This script always writes both, and repairs the link if it is already wrong.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// ---------------------------------------------------------------- env loading
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

function die(message, hint) {
  console.error(`\n${RED('✗')} ${message}`);
  if (hint) console.error(DIM(`  ${hint}`));
  console.error('');
  process.exit(1);
}

// ------------------------------------------------------------------- main
loadEnv();
const args = parseArgs(process.argv.slice(2));
const listOnly = Boolean(args.list);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  die(
    'Supabase is not configured.',
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first. See docs/SETUP.md.',
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listAdmins() {
  const { data, error } = await supabase
    .from('admins')
    .select('id, email, name, role, created_at')
    .order('created_at');

  if (error) {
    die(
      `Could not read the admins table: ${error.message}`,
      'Have you run supabase/migrations/0001_init.sql yet?',
    );
  }
  if (!data || data.length === 0) {
    console.log(`\n${DIM('No admins yet.')} Run: npm run admin:create\n`);
    return;
  }

  console.log(`\n${BOLD('Admins with access to /admin')}\n`);
  for (const a of data) {
    console.log(`  ${a.email.padEnd(34)} ${(a.name ?? '—').padEnd(20)} ${DIM(a.role ?? 'admin')}`);
  }
  console.log('');
}

async function createAdmin() {
  const rl = createInterface({ input: stdin, output: stdout });
  const ask = async (label, fallback) => {
    if (fallback) return fallback;
    const answer = await rl.question(label);
    return answer.trim();
  };

  const email = (await ask('Admin email: ', args.email)).toLowerCase();
  const password = await ask('Password (min 8 characters): ', args.password);
  const name = await ask('Display name: ', args.name);
  rl.close();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) die('That is not a valid email address.');
  if (!password || password.length < 8) die('Password must be at least 8 characters.');

  // 1. Find or create the auth user. -------------------------------------
  let userId = null;
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingList?.users?.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (existing) {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) die(`Could not update that auth user: ${error.message}`);
    console.log(`${DIM('·')} Auth user existed — password reset.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no inbox round-trip for a staff account
      user_metadata: { name },
    });
    if (error) die(`Could not create the auth user: ${error.message}`);
    userId = data.user.id;
    console.log(`${DIM('·')} Auth user created.`);
  }

  // 2. Link the admins row to that exact id. ------------------------------
  const { data: row } = await supabase
    .from('admins')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (row && row.id !== userId) {
    // A row exists but points at the wrong uid — that grants no access.
    const { error } = await supabase.from('admins').delete().eq('email', email);
    if (error) die(`Could not repair the stale admins row: ${error.message}`);
    console.log(`${DIM('·')} Removed an admins row whose id did not match the auth user.`);
  }

  const { error: upsertError } = await supabase
    .from('admins')
    .upsert({ id: userId, email, name: name || null, role: 'admin' }, { onConflict: 'id' });

  if (upsertError) {
    die(
      `Could not write the admins row: ${upsertError.message}`,
      'Have you run supabase/migrations/0001_init.sql yet?',
    );
  }

  console.log(`${DIM('·')} admins row linked to auth id ${userId}`);
  console.log(`\n${GREEN('✓')} ${BOLD(email)} can now sign in at /admin/login\n`);
}

try {
  if (listOnly) await listAdmins();
  else {
    await createAdmin();
    await listAdmins();
  }
} catch (err) {
  die(err.message);
}
