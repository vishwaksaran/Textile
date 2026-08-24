import { AdminShell } from '@/components/admin/shell';
import { getCurrentAdmin } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { AdminSetupNotice } from '@/components/admin/setup-notice';
import { AdminAccessDenied } from '@/components/admin/access-denied';

export const dynamic = 'force-dynamic';

/**
 * Guarded shell for every authenticated admin screen.
 *
 * Three gates, deliberately layered: middleware redirects anyone without a
 * Supabase session, this layout re-checks membership of the `admins` table on
 * the server, and each /api/admin route calls requireAdmin() again — so a
 * hand-crafted request cannot skip the UI.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <AdminSetupNotice />;

  const admin = await getCurrentAdmin();
  if (!admin) return <AdminAccessDenied />;

  return <AdminShell adminName={admin.email}>{children}</AdminShell>;
}
