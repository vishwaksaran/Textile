'use client';

import * as React from 'react';
import { Info, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { SHIPPING_ZONES, type ShippingSettings } from '@/lib/shipping';

/**
 * "How is this worked out?" for the delivery charge.
 *
 * A charge that appears without explanation reads as padding, and a customer
 * who cannot see why theirs is higher than someone else's asks for it to be
 * removed. So the rates are simply shown — all of them, from the same
 * settings the checkout quotes with, so this panel cannot drift out of date
 * the way hand-written policy copy does.
 *
 * Built as a toggle rather than a hover tooltip: hover does not exist on a
 * phone, which is where most of these orders are placed. It closes on Escape
 * and on a click outside, and the trigger is a real button so it is reachable
 * by keyboard.
 */
export function ShippingInfo({ settings }: { settings: ShippingSettings }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="How delivery charges are worked out"
        className="ml-1.5 inline-flex items-center text-on-surface-variant transition-colors hover:text-deep-maroon"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      {open && (
        <span
          role="dialog"
          aria-label="Delivery charges"
          className="absolute bottom-full right-0 z-50 mb-2 block w-[280px] rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4 text-left shadow-[0_8px_28px_rgba(74,4,4,0.16)]"
        >
          <span className="mb-2 flex items-start justify-between gap-3">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
              Delivery charges
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 p-1 text-on-surface-variant hover:text-deep-maroon"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </span>

          <span className="block font-body-md text-xs leading-relaxed text-on-surface-variant">
            What it costs to send a parcel depends on how far it travels. Tamil Nadu is the
            least; the north-east and the islands the most, because the courier charges more
            to reach them.
          </span>

          <span className="mt-3 block space-y-1">
            {SHIPPING_ZONES.map((zone) => {
              const rate = settings.zoneRates[zone.id] ?? settings.defaultRate;
              return (
                <span key={zone.id} className="flex justify-between gap-3 font-body-md text-xs">
                  <span className="text-on-surface-variant">{zone.label}</span>
                  <span className="tabular-nums text-on-surface">{formatINR(rate)}</span>
                </span>
              );
            })}
          </span>

          {settings.freeThreshold > 0 && (
            <span className="mt-3 block rounded bg-primary-container/15 px-2.5 py-2 font-body-md text-xs text-on-surface">
              Free anywhere in India on orders of{' '}
              <strong>{formatINR(settings.freeThreshold)}</strong> and above.
            </span>
          )}

          <span className="mt-3 block font-body-md text-[11px] leading-relaxed text-on-surface-variant">
            Sarees are light and fold flat, so the charge is per order rather than by weight
            or size — a second piece in the same parcel costs you nothing more. Your exact
            figure appears above once the state is chosen.
          </span>
        </span>
      )}
    </span>
  );
}
