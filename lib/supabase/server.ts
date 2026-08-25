import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalise what a shop owner pastes into a host's environment panel.
 *
 * Supabase shows the project URL with its scheme, but it is easy to copy just
 * the hostname — and supabase-js then rejects it with "Invalid supabaseUrl"
 * from deep inside a production build, where the message is easy to miss.
 * A bare hostname is unambiguous, so add the scheme rather than fail. Blank
 * stays blank, which is what keeps the store in demo mode.
 */
function normaliseSupabaseUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim().replace(/\/+$/, '');
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const supabaseUrl = normaliseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;

/** True when the project has real Supabase credentials wired up. */
export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey);

/** True when the server can write (orders, stock, uploads). */
export const isServiceRoleConfigured = Boolean(supabaseUrl && serviceKey);

/**
 * Cookie-free anon client for reading public catalogue data.
 *
 * The storefront's products and categories are public rows fetched with the
 * anon key — no visitor session is involved — so touching cookies for them is
 * both unnecessary and harmful:
 *
 *   1. `cookies()` throws outside a request scope, which broke
 *      `generateStaticParams` during the production build, but only once
 *      Supabase credentials were present (without them the client short-
 *      circuits to demo data before ever reaching cookies).
 *   2. Reading cookies opts the calling route into dynamic rendering,
 *      quietly defeating the `revalidate` settings on the storefront pages.
 *
 * Use `createServerSupabase()` instead wherever the caller's session matters.
 */
export function createPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createSupabaseClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Request-scoped client that carries the caller's auth cookie.
 * Reads run under RLS, so this is safe to use for anything user-facing.
 */
export function createServerSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = cookies();

  return createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Service-role client: bypasses RLS. Server-only, never import into a
 * component that ships to the browser.
 */
export function createAdminSupabase(): SupabaseClient | null {
  if (!isServiceRoleConfigured) return null;
  return createSupabaseClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Throws instead of returning null — for routes that cannot degrade. */
export function requireAdminSupabase(): SupabaseClient {
  const client = createAdminSupabase();
  if (!client) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set for this operation.',
    );
  }
  return client;
}
