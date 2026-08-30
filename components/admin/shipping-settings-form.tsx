'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { INDIAN_STATES } from '@/lib/states';
import {
  SHIPPING_ZONES,
  quoteShipping,
  statesWithoutZone,
  zoneForState,
  type ShippingSettings,
} from '@/lib/shipping';
import { formatINR } from '@/lib/utils';

/**
 * Delivery charges, by destination.
 *
 * Laid out as zones first and states second because that is the order the
 * rate is resolved in, and because a shop owner thinks "what do I charge to
 * send north" far more often than "what do I charge to send to Tripura".
 * Per-state boxes sit below, empty by default, showing what the zone would
 * otherwise charge — so an override reads as a deliberate exception.
 */
export function ShippingSettingsForm({ initial }: { initial: ShippingSettings }) {
  const router = useRouter();
  const [freeThreshold, setFreeThreshold] = React.useState(String(initial.freeThreshold));
  const [defaultRate, setDefaultRate] = React.useState(String(initial.defaultRate));
  const [zoneRates, setZoneRates] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      SHIPPING_ZONES.map((z) => [z.id, initial.zoneRates[z.id] === undefined ? '' : String(initial.zoneRates[z.id])]),
    ),
  );
  const [stateRates, setStateRates] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      INDIAN_STATES.map((s) => [s, initial.stateRates[s] === undefined ? '' : String(initial.stateRates[s])]),
    ),
  );
  const [busy, setBusy] = React.useState(false);

  const unzoned = React.useMemo(() => statesWithoutZone(), []);

  // Live settings as typed, so the preview reflects unsaved edits.
  const draft: ShippingSettings = React.useMemo(
    () => ({
      freeThreshold: Number(freeThreshold) || 0,
      defaultRate: Number(defaultRate) || 0,
      zoneRates: Object.fromEntries(
        Object.entries(zoneRates)
          .filter(([, v]) => v !== '')
          .map(([k, v]) => [k, Number(v) || 0]),
      ),
      stateRates: Object.fromEntries(
        Object.entries(stateRates)
          .filter(([, v]) => v !== '')
          .map(([k, v]) => [k, Number(v) || 0]),
      ),
    }),
    [freeThreshold, defaultRate, zoneRates, stateRates],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/shipping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeThreshold: draft.freeThreshold,
          defaultRate: draft.defaultRate,
          zoneRates: draft.zoneRates,
          stateRates: draft.stateRates,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save.');
      toast.success('Shipping rates saved.', {
        description: 'New orders are quoted at these rates immediately.',
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
        <h2 className="mb-5 font-headline-md text-headline-md text-deep-maroon">
          Across the board
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Free shipping above (₹)"
            htmlFor="freeThreshold"
            hint="Orders at or above this ship free anywhere. Set 0 to always charge."
          >
            <Input
              id="freeThreshold"
              inputMode="numeric"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>

          <Field
            label="Default rate (₹)"
            htmlFor="defaultRate"
            hint="Used only if a state belongs to no zone and has no rate of its own."
          >
            <Input
              id="defaultRate"
              inputMode="numeric"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
        <h2 className="mb-1 font-headline-md text-headline-md text-deep-maroon">By zone</h2>
        <p className="mb-5 font-body-md text-sm text-on-surface-variant">
          What it costs to send a parcel to each part of the country. This is where most of
          the work should be done — a state only needs its own rate if it is an exception.
        </p>

        <div className="space-y-4">
          {SHIPPING_ZONES.map((zone) => (
            <div key={zone.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
              <div className="min-w-0">
                <p className="font-body-md text-body-md text-on-surface">{zone.label}</p>
                <p className="font-body-md text-xs text-on-surface-variant">
                  {zone.states.join(' · ')}
                </p>
              </div>
              <Input
                inputMode="numeric"
                aria-label={`Rate for ${zone.label}`}
                placeholder={`${draft.defaultRate}`}
                value={zoneRates[zone.id] ?? ''}
                onChange={(e) =>
                  setZoneRates((r) => ({ ...r, [zone.id]: e.target.value.replace(/[^\d]/g, '') }))
                }
              />
            </div>
          ))}
        </div>

        {unzoned.length > 0 && (
          <div className="mt-5 flex gap-3 rounded-md border border-warning/40 bg-warning-container/40 p-4">
            <TriangleAlert className="h-5 w-5 flex-none text-warning" strokeWidth={1.5} />
            <p className="font-body-md text-sm text-on-surface">
              Not in any zone, so these fall back to the default rate:{' '}
              <strong>{unzoned.join(', ')}</strong>. Give them their own rate below, or add
              them to a zone in the code.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
        <h2 className="mb-1 font-headline-md text-headline-md text-deep-maroon">
          Exceptions, by state
        </h2>
        <p className="mb-5 font-body-md text-sm text-on-surface-variant">
          Leave blank to use the zone rate — the greyed figure is what that would be. Fill
          one in only where a state genuinely costs something different.
        </p>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {INDIAN_STATES.map((state) => {
            const zoneId = zoneForState(state);
            const zone = SHIPPING_ZONES.find((z) => z.id === zoneId);
            const fallback = zoneId ? draft.zoneRates[zoneId] : undefined;
            return (
              <div key={state} className="grid grid-cols-[1fr_110px] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate font-body-md text-sm text-on-surface">{state}</p>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {zone ? zone.label : 'No zone'}
                  </p>
                </div>
                <Input
                  inputMode="numeric"
                  aria-label={`Rate for ${state}`}
                  placeholder={String(fallback ?? draft.defaultRate)}
                  value={stateRates[state] ?? ''}
                  onChange={(e) =>
                    setStateRates((r) => ({ ...r, [state]: e.target.value.replace(/[^\d]/g, '') }))
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-6">
        <h2 className="mb-1 font-headline-md text-headline-md text-deep-maroon">Preview</h2>
        <p className="mb-5 font-body-md text-sm text-on-surface-variant">
          A {formatINR(2000)} order, as it would be quoted at checkout today.
        </p>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {['Tamil Nadu', 'Kerala', 'Maharashtra', 'Delhi', 'West Bengal', 'Assam'].map((s) => {
            const q = quoteShipping(2000, s, draft);
            return (
              <div key={s} className="flex justify-between gap-4 font-body-md text-sm">
                <dt className="text-on-surface-variant">{s}</dt>
                <dd className="tabular-nums text-on-surface">
                  {q.amount === 0 ? 'Free' : formatINR(q.amount)}
                  <span className="ml-2 text-xs text-on-surface-variant">({q.reason})</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <Button type="submit" disabled={busy} shine>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save shipping rates
      </Button>
    </form>
  );
}
