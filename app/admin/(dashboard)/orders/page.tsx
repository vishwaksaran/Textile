import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { OrdersTable } from '@/components/admin/orders-table';
import { TableSkeleton } from '@/components/shared/skeleton';
import { listAdminOrders } from '@/lib/admin-data';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; payment?: string; q?: string; from?: string; to?: string };
}) {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  // Paid unless the URL says otherwise — see DEFAULTS in OrdersTable.
  const orders = await listAdminOrders({ ...searchParams, payment: searchParams.payment ?? 'paid' });

  return (
    <AdminPage>
      <AdminHeader
        title="Orders"
        subtitle="Add a tracking ID to notify the customer over WhatsApp, SMS and email."
      />
      <Suspense key={JSON.stringify(searchParams)} fallback={<TableSkeleton />}>
        <OrdersTable orders={orders} />
      </Suspense>
    </AdminPage>
  );
}
