import type { Metadata } from 'next';
import { AdminHeader, AdminPage } from '@/components/admin/ui';
import { TaxSettingsForm } from '@/components/admin/tax-settings-form';
import { getTaxSettings } from '@/lib/tax-settings';
import { STORE } from '@/lib/config';
import { stateCodeFromGstin } from '@/lib/tax';

export const metadata: Metadata = { title: 'Tax Settings' };
export const dynamic = 'force-dynamic';

export default async function TaxSettingsPage() {
  const settings = await getTaxSettings();
  const stateCode = stateCodeFromGstin(STORE.gstin);

  return (
    <AdminPage>
      <AdminHeader
        title="Tax Settings"
        subtitle={`GSTIN ${STORE.gstin}${stateCode ? ` — registered in state ${stateCode}, Tamil Nadu` : ''}`}
      />

      <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-5">
        <p className="font-body-md text-sm text-on-surface-variant">
          Place of supply is worked out per order from the buyer&rsquo;s state against your
          GSTIN: a Tamil Nadu buyer is charged CGST + SGST, anyone else IGST. Both are
          frozen onto the order when it is placed, so reprinting an old invoice always shows
          the tax that actually applied.
        </p>
      </div>

      <TaxSettingsForm initial={settings} gstin={STORE.gstin} />
    </AdminPage>
  );
}
