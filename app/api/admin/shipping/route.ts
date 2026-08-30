import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { getShippingSettings, updateShippingSettings } from '@/lib/shipping-settings';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

/** Rejects anything that is not a sane rupee amount. */
function rate(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100000) {
    throw new Error(`${label} must be an amount between 0 and 100000.`);
  }
  // Whole rupees: a courier charge with paise in it only ever confuses the
  // customer and the total it feeds into.
  return Math.round(n);
}

function rateMap(value: unknown, label: string): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // An empty string means "no override" — drop it rather than storing a
    // zero, which would silently make that destination ship free.
    if (v === '' || v === null || v === undefined) continue;
    out[k] = rate(v, `${label} for ${k}`);
  }
  return out;
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ settings: await getShippingSettings() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    const settings = await updateShippingSettings({
      freeThreshold:
        body.freeThreshold === undefined ? undefined : rate(body.freeThreshold, 'Free shipping threshold'),
      defaultRate:
        body.defaultRate === undefined ? undefined : rate(body.defaultRate, 'Default rate'),
      zoneRates: body.zoneRates === undefined ? undefined : rateMap(body.zoneRates, 'Zone rate'),
      stateRates: body.stateRates === undefined ? undefined : rateMap(body.stateRates, 'State rate'),
    });

    // The free-shipping threshold is quoted on product pages, which are
    // statically generated — without this they would keep promising the old
    // figure until their revalidate window lapsed.
    revalidateCatalogue();

    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}
