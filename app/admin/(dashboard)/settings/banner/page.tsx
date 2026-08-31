import type { Metadata } from 'next';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { HeroManager } from '@/components/admin/hero-manager';
import { getCategories } from '@/lib/data';
import { requireAdminSupabase } from '@/lib/supabase/server';
import type { HeroSlideRow } from '@/types';

export const metadata: Metadata = { title: 'Home Banner' };
export const dynamic = 'force-dynamic';

export default async function BannerPage() {
  const supabase = requireAdminSupabase();
  const [{ data }, categories] = await Promise.all([
    supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    getCategories(),
  ]);

  return (
    <AdminPage>
      <AdminHeader
        title="Home Banner"
        subtitle="The rotating slides at the top of the home page."
      />

      <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-5">
        <p className="font-body-md text-sm text-on-surface-variant">
          Add a slide to feature a piece or a collection — it appears on the home page as soon
          as you save, with no deploy. While there are no slides here the site falls back to
          its three built-in ones. Use a wide, landscape image: it is cropped to the full width
          of the screen, and the headline sits over the lower half.
        </p>
      </div>

      <HeroManager initial={(data as HeroSlideRow[]) ?? []} categories={categories} />
    </AdminPage>
  );
}
