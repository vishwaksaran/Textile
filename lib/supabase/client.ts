'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Same normalisation as the server client: a project URL pasted without its
 * scheme is unambiguous, and letting it through would fail admin sign-in at
 * runtime with "Invalid supabaseUrl". Kept local rather than imported, since
 * the server module pulls in next/headers.
 *
 * The `process.env.NEXT_PUBLIC_*` references stay literal on purpose — Next
 * substitutes them at build time, and a dynamic lookup would not survive
 * into the browser bundle.
 */
function normalise(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim().replace(/\/+$/, '');
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const url = normalise(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;

export const supabaseConfigured = Boolean(url && key);

/**
 * Browser-side Supabase client. Only used for admin auth (sign in / sign out)
 * and admin uploads — all store reads happen on the server.
 */
export function createClient() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return createBrowserClient(url!, key!);
}
