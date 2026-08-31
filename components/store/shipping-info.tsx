'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { SHIPPING_ZONES, type ShippingSettings } from '@/lib/shipping';

/**
 * "How is this worked out?" for the delivery charge.
 *
 * A charge that appears without explanation reads as padding, and a customer
 * who cannot see why theirs is higher than someone else's asks for it to be
 * removed. So the rates are simply shown — all of them, read from the same
 * settings the checkout quotes with, so this cannot drift out of date the way
 * hand-written policy copy does.
 *
 * A modal rather than a popover anchored to the icon. Anchored, it had
 * nowhere good to go: above, it ran off the top of the screen; below, it
 * covered the total it was explaining and needed its own scrollbar. A panel
 * with six rows and three paragraphs is simply bigger than the space beside a
 * summary line. Centred over a dimmed page it has room, and on a phone it is
 * the difference between a readable table and a sliver.
 *
 * Rendered through a portal so no ancestor's overflow or stacking context can
 * clip it, and the page behind is locked while it is open.
 */
export function ShippingInfo({ settings }: { settings: ShippingSettings }) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    // Stop the page scrolling underneath the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus in, so a keyboard user is not left behind on the page.
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="How delivery charges are worked out"
        className="ml-1.5 inline-flex items-center text-on-surface-variant transition-colors hover:text-deep-maroon"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-charges-title"
          >
            {/* Clicking the dim closes it — the ordinary expectation. */}
            <button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-on-background/50 backdrop-blur-[2px]"
            />

            <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest shadow-[0_16px_48px_rgba(74,4,4,0.25)]">
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant/40 px-6 py-4">
                <h2
                  id="delivery-charges-title"
                  className="font-headline-md text-headline-md text-deep-maroon"
                >
                  Delivery charges
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-2 -mt-1 rounded p-2 text-on-surface-variant transition-colors hover:text-deep-maroon"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  What it costs to send depends on how far the parcel travels — Tamil Nadu is
                  the least, the north-east and the islands the most.
                </p>

                <table className="mt-5 w-full border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/50">
                      <th className="pb-2 text-left font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                        Destination
                      </th>
                      <th className="w-20 pb-2 text-right font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                        1st
                      </th>
                      <th className="w-24 pb-2 text-right font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                        Each more
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHIPPING_ZONES.map((zone) => {
                      const first = settings.zoneRates[zone.id] ?? settings.defaultRate;
                      const extra =
                        settings.zoneExtraRates[zone.id] ?? settings.defaultExtraRate;
                      return (
                        <tr key={zone.id} className="border-b border-outline-variant/25">
                          <td className="py-2.5 font-body-md text-sm text-on-surface">
                            {zone.label}
                          </td>
                          <td className="py-2.5 text-right font-body-md text-sm tabular-nums text-on-surface">
                            {formatINR(first)}
                          </td>
                          <td className="py-2.5 text-right font-body-md text-sm tabular-nums text-on-surface">
                            {formatINR(extra)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {settings.freeThreshold > 0 && (
                  <p className="mt-5 rounded bg-primary-container/15 px-4 py-3 font-body-md text-sm text-on-surface">
                    Free anywhere in India on orders of{' '}
                    <strong>{formatINR(settings.freeThreshold)}</strong> and above.
                  </p>
                )}

                <p className="mt-4 font-body-md text-sm leading-relaxed text-on-surface-variant">
                  Charged per piece: the first rate, then the second column for every saree
                  after it. Sarees fold flat and weigh little, so distance sets the price
                  rather than weight or size. Your exact figure is shown on the order summary
                  once the state is chosen.
                </p>
              </div>

              <div className="border-t border-outline-variant/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded bg-deep-maroon px-4 py-2.5 font-label-lg text-label-lg uppercase tracking-widest text-primary-fixed transition-opacity hover:opacity-90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
