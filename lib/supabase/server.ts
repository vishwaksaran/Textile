import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the project has real Supabase credentials wired up. */
export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey);

/** True when the server can write (orders, stock, uploads). */
export const isServiceRoleConfigured = Boolean(supabaseUrl && serviceKey);

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
