import Link from 'next/link';
import { getProductAttributeValues } from '@/lib/attributes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured, requireAdminSupabase } from '@/lib/supabase/server';
import { listAdminProducts } from '@/lib/admin-data';
import type { Product } from '@/types';

export const metadata: Metadata = { title: 'Edit product' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  const supabase = requireAdminSupabase();

  const [{ data }, { categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories:category_id (id, name, slug)')
      .eq('id', params.id)
      .maybeSingle(),
    listAdminProducts(),
  ]);

  if (!data) notFound();
  const product = data as unknown as Product;

  const attributeValues = await getProductAttributeValues(product.id);


  return (
    <AdminPage>
      <AdminHeader
        title={product.name}
        subtitle="Edit the details, price, stock and images."
        action={
          <Button asChild variant="outline">
            <Link href={`/product/${product.id}`} target="_blank">
              View on store
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
      <ProductForm categories={categories} product={{ ...product, attributeValues }} />
    </AdminPage>
  );
}
