'use client';

import * as React from 'react';
import { X } from 'lucide-react';

/**
 * Shown only while Supabase credentials are missing, so nobody mistakes the
 * bundled catalogue for live inventory.
 */
export function DemoDataNotice() {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  return (
    <div className="relative bg-primary-container/20 px-margin-mobile py-2 text-center md:px-margin-desktop">
      <p className="font-body-md text-xs text-on-surface-variant">
        Demo catalogue — Supabase is not configured yet, so products and stock come from the
        bundled seed data. Payments run in Razorpay test mode.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss demo notice"
        className="absolute right-2 top-1.5 rounded p-1 text-on-surface-variant hover:text-deep-maroon"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
