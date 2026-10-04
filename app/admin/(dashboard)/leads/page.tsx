import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { LeadsTable } from '@/components/admin/leads-table';
import { TableSkeleton } from '@/components/shared/skeleton';
import { listAdminLeads } from '@/lib/admin-data';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Leads' };
export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { status?: string; kind?: string; q?: string };
}) {
  // The layout renders the setup notice; skip the query that would throw.
  if (!isSupabaseConfigured) return null;

  const leads = await listAdminLeads(searchParams);

  return (
    <AdminPage>
      <AdminHeader
        title="Leads"
        subtitle="Wholesale and retail enquiries. WhatsApp a new lead and it is marked contacted."
      />
      <Suspense key={JSON.stringify(searchParams)} fallback={<TableSkeleton />}>
        <LeadsTable leads={leads} />
      </Suspense>
    </AdminPage>
  );
}
