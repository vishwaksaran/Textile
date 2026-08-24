import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminPage } from '@/components/admin/ui';
import { CategoriesManager } from '@/components/admin/categories-manager';
import { TableSkeleton } from '@/components/shared/skeleton';
import { listAdminCategories } from '@/lib/admin-data';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Collections' };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  const categories = await listAdminCategories();

  return (
    <AdminPage>
      <Suspense fallback={<TableSkeleton />}>
        <CategoriesManager categories={categories} />
      </Suspense>
    </AdminPage>
  );
}
