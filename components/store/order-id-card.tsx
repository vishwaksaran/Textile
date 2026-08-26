'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

/**
 * The order ID, presented as something to keep rather than a detail in prose.
 *
 * Shows the short code because that is what appears on the invoice and in the
 * confirmation email, and what the tracking page asks for. Copying puts the
 * full id on the clipboard, since that opens the order on its own without a
 * phone number.
 */
export function OrderIdCard({ shortId, fullId }: { shortId: string; fullId: string }) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullId);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      toast.success('Order ID copied');
    } catch {
      // Clipboard is blocked on insecure origins and in some browsers; the id
      // is on screen either way, so this is a convenience, not the only route.
      toast.error('Could not copy — the ID is shown above.');
    }
  }

  return (
    <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3 rounded-lg border border-primary-container/40 bg-primary-container/10 px-5 py-4">
      <span className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
        Your order ID
      </span>
      <strong className="select-all font-headline-md text-[26px] tracking-wide text-deep-maroon">
        #{shortId}
      </strong>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon transition-opacity hover:opacity-70"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy full ID'}
      </button>
      <p className="text-center font-body-md text-xs text-on-surface-variant">
        Save this. You can track your order with it and the mobile number you gave at checkout.
      </p>
    </div>
  );
}
