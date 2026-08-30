import type { Metadata } from 'next';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { ShippingSettingsForm } from '@/components/admin/shipping-settings-form';
import { getShippingSettings } from '@/lib/shipping-settings';

export const metadata: Metadata = { title: 'Shipping Rates' };
export const dynamic = 'force-dynamic';

export default async function ShippingSettingsPage() {
  const settings = await getShippingSettings();

  return (
    <AdminPage>
      <AdminHeader
        title="Shipping Rates"
        subtitle="What delivery costs, by where the parcel is going."
      />

      <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-5">
        <p className="font-body-md text-sm text-on-surface-variant">
          A charge is worked out in this order: the rate for that state if one is set,
          otherwise the rate for its zone, otherwise the default. An order at or above the
          free-shipping threshold ships free regardless. The customer sees the figure at
          checkout and the server recalculates it before charging, so the two always agree.
        </p>
      </div>

      <ShippingSettingsForm initial={settings} />
    </AdminPage>
  );
}
