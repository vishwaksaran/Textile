import 'server-only';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import type { Admin } from '@/types';

/**
 * Resolves the signed-in admin, or null. An account is an admin only if its
 * auth user id (or email) appears in the `admins` table.
 */
export async function getCurrentAdmin(): Promise<Admin | null> {
  const supabase = createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Read through the service role so the lookup does not depend on the
  // admins-table RLS policy being permissive.
  const admin = createAdminSupabase() ?? supabase;
  const { data } = await admin
    .from('admins')
    .select('*')
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  return (data as Admin) ?? null;
}

export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new UnauthorisedError();
  return admin;
}

export class UnauthorisedError extends Error {
  constructor() {
    super('Admin access required.');
    this.name = 'UnauthorisedError';
  }
}

/**
 * Server-to-server guard for the internal notification routes. Accepts either
 * a signed-in admin or a matching INTERNAL_API_SECRET header.
 */
export async function assertInternalCaller(request: Request): Promise<boolean> {
  const secret = process.env.INTERNAL_API_SECRET;
  const header = request.headers.get('x-internal-token');
  if (secret && header && header === secret) return true;
  return Boolean(await getCurrentAdmin());
}
