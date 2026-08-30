import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { getTaxSettings, updateTaxSettings } from '@/lib/tax-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ settings: await getTaxSettings() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    // The rate goes straight onto every invoice, so reject anything that is
    // not a sane percentage rather than letting a typo silently mis-state tax.
    let gstRate: number | undefined;
    if (body.gstRate !== undefined) {
      gstRate = Number(body.gstRate);
      if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
        return NextResponse.json(
          { error: 'GST rate must be a percentage between 0 and 100.' },
          { status: 400 },
        );
      }
    }

    // HSN codes are 4, 6 or 8 digits. Blank clears it.
    let defaultHsn: string | null | undefined;
    if (body.defaultHsn !== undefined) {
      const raw = String(body.defaultHsn ?? '').trim();
      if (raw && !/^\d{4}(\d{2})?(\d{2})?$/.test(raw)) {
        return NextResponse.json(
          { error: 'HSN code must be 4, 6 or 8 digits.' },
          { status: 400 },
        );
      }
      defaultHsn = raw || null;
    }

    const settings = await updateTaxSettings({
      gstRate,
      defaultHsn,
      pricesIncludeTax:
        body.pricesIncludeTax === undefined ? undefined : Boolean(body.pricesIncludeTax),
      showTaxBreakdown:
        body.showTaxBreakdown === undefined ? undefined : Boolean(body.showTaxBreakdown),
    });

    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}
