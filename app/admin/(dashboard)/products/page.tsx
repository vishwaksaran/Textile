import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { ProductsTable } from '@/components/admin/products-table';
import { Button } from '@/components/ui/button';
import { listAdminProducts } from '@/lib/admin-data';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { stock?: string };
}) {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  const { products, categories } = await listAdminProducts();

  const initialStock =
    searchParams.stock === 'low' || searchParams.stock === 'out' || searchParams.stock === 'in'
      ? searchParams.stock
      : 'all';

  return (
    <AdminPage>
      <AdminHeader
        title="Products"
        subtitle={`${products.length} pieces in the catalogue.`}
        action={
          <Button asChild shine>
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          </Button>
        }
      />
      <ProductsTable products={products} categories={categories} initialStock={initialStock} />
    </AdminPage>
  );
}
