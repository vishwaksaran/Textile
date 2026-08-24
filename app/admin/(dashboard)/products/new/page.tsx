import type { Metadata } from 'next';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';
import { listAdminProducts } from '@/lib/admin-data';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Add product' };
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  const { categories } = await listAdminProducts();

  return (
    <AdminPage>
      <AdminHeader
        title="Add a product"
        subtitle="It goes live on the storefront as soon as you save it."
      />
      <ProductForm categories={categories} />
    </AdminPage>
  );
}
