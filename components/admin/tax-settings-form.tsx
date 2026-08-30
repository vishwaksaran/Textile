'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Percent, Save, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { computeTax, type TaxSettings } from '@/lib/tax';
import { formatINR } from '@/lib/utils';

/**
 * Shop-wide GST controls.
 *
 * The preview is the point of this screen. A rate typed into a box is
 * abstract; the same rate shown splitting a real Rs.52,000 sale into taxable
 * value and CGST/SGST is checkable at a glance, and it makes the
 * tax-inclusive rule visible — the total never moves, only the split does.
 */
export function TaxSettingsForm({
  initial,
  gstin,
}: {
  initial: TaxSettings;
  gstin: string;
}) {
  const router = useRouter();
  const [settings, setSettings] = React.useState<TaxSettings>(initial);
  const [busy, setBusy] = React.useState(false);

  const dirty =
    settings.gstRate !== initial.gstRate ||
    (settings.defaultHsn ?? '') !== (initial.defaultHsn ?? '') ||
    settings.pricesIncludeTax !== initial.pricesIncludeTax ||
    settings.showTaxBreakdown !== initial.showTaxBreakdown;

  const preview = React.useMemo(
    () =>
      computeTax({
        items: [
          {
            description: 'Sample saree',
            quantity: 1,
            gross: 52000,
            hsn: settings.defaultHsn,
          },
        ],
        buyerState: 'Tamil Nadu',
        sellerGstin: gstin,
        settings,
      }),
    [settings, gstin],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/tax', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save.');
      toast.success('Tax settings saved.', {
        description: 'New invoices use these values immediately.',
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
        <h2 className="mb-1 font-headline-md text-headline-md text-deep-maroon">
          Default GST rate
        </h2>
        <p className="mb-5 font-body-md text-sm text-on-surface-variant">
          Applied to any product without its own rate. A product can override this on its
          own page, which is how you handle a mixed catalogue.
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="GST rate (%)" htmlFor="gstRate">
            <div className="relative">
              <Input
                id="gstRate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.gstRate}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, gstRate: Number(e.target.value) }))
                }
              />
              <Percent
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
                strokeWidth={1.5}
              />
            </div>
          </Field>

          <Field
            label="Default HSN code"
            htmlFor="defaultHsn"
            hint="4, 6 or 8 digits. Leave blank until you have them."
          >
            <Input
              id="defaultHsn"
              inputMode="numeric"
              placeholder="e.g. 5007"
              value={settings.defaultHsn ?? ''}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaultHsn: e.target.value || null }))
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
        <h2 className="mb-5 font-headline-md text-headline-md text-deep-maroon">
          How prices are quoted
        </h2>

        <Toggle
          checked={settings.pricesIncludeTax}
          onChange={(v) => setSettings((s) => ({ ...s, pricesIncludeTax: v }))}
          label="Listed prices include GST"
          description="Standard for Indian retail. The customer pays the listed figure and tax is worked backwards out of it, so the invoice total always matches what was charged."
        />

        {!settings.pricesIncludeTax && (
          <div className="mt-4 flex gap-3 rounded-md border border-warning/40 bg-warning-container/40 p-4">
            <TriangleAlert className="h-5 w-5 flex-none text-warning" strokeWidth={1.5} />
            <p className="font-body-md text-sm text-on-surface">
              With this off, tax is added <strong>on top</strong> of the listed price. The
              invoice will then total more than the amount the customer was charged at
              checkout. Only use this if the storefront prices are genuinely pre-tax.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-outline-variant/40 pt-6">
          <Toggle
            checked={settings.showTaxBreakdown}
            onChange={(v) => setSettings((s) => ({ ...s, showTaxBreakdown: v }))}
            label="Show the GST breakdown on invoices"
            description="Turn off to print a plain receipt with no HSN or tax rows — what a shop that is not GST-registered should send."
          />
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-6">
        <h2 className="mb-1 font-headline-md text-headline-md text-deep-maroon">Preview</h2>
        <p className="mb-5 font-body-md text-sm text-on-surface-variant">
          A {formatINR(52000)} sale to a Tamil Nadu customer, at the settings above.
        </p>

        {settings.showTaxBreakdown ? (
          <dl className="space-y-2 font-body-md text-body-md">
            <Row label="Taxable value" value={formatINR(preview.totals.taxable)} />
            {preview.byRate.map((b) => (
              <React.Fragment key={b.rate}>
                <Row label={`CGST @ ${b.rate / 2}%`} value={formatINR(b.cgst)} />
                <Row label={`SGST @ ${b.rate / 2}%`} value={formatINR(b.sgst)} />
              </React.Fragment>
            ))}
            <div className="border-t border-outline-variant/40 pt-2">
              <Row label="Total charged" value={formatINR(preview.totals.gross)} emphasis />
            </div>
          </dl>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Invoices will show a single {formatINR(52000)} total with no tax rows.
          </p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={busy || !dirty} shine>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save settings
        </Button>
        {dirty && !busy && (
          <span className="font-body-md text-sm text-on-surface-variant">
            Unsaved changes.
          </span>
        )}
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={emphasis ? 'font-semibold text-deep-maroon' : 'text-on-surface-variant'}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${emphasis ? 'font-bold text-deep-maroon' : 'text-on-surface'}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The visual switch is a span, never the button itself. A global
 * `pointer: coarse` rule sets a 44px minimum on buttons for touch, which
 * previously stretched controls like this one out of shape — so the button
 * carries the touch target and the span carries the appearance.
 */
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex flex-none items-center bg-transparent p-0"
      >
        <span
          className={`relative block h-6 w-11 rounded-full transition-colors ${
            checked ? 'bg-deep-maroon' : 'bg-outline-variant'
          }`}
        >
          <span
            className={`absolute top-0.5 block h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-all ${
              checked ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
      <div className="min-w-0">
        <p className="font-body-md text-body-md text-on-surface">{label}</p>
        <p className="mt-1 font-body-md text-sm text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}
