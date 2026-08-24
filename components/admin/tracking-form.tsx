'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  Smartphone,
  Mail,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { COURIERS } from '@/lib/config';
import { formatDateTime } from '@/lib/utils';
import type { Order } from '@/types';

interface ChannelResult {
  sent: boolean;
  id?: string;
  skipped?: string;
  error?: string;
}

interface TrackingResponse {
  success: boolean;
  trackingUrl: string;
  notifications: { whatsapp: ChannelResult; sms: ChannelResult; email: ChannelResult };
}

/**
 * Saves the courier's tracking ID and fires the customer notifications.
 * The per-channel outcome is shown afterwards, because a WhatsApp template
 * awaiting Meta approval will fail while SMS still goes through.
 */
export function TrackingForm({ order }: { order: Order }) {
  const router = useRouter();
  const [trackingId, setTrackingId] = React.useState(order.tracking_id ?? '');
  const [courier, setCourier] = React.useState(order.courier_name ?? COURIERS[0]);
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TrackingResponse | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trackingId.trim()) {
      setError('Enter the tracking ID from the courier.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: trackingId.trim(), courierName: courier, notify }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save the tracking ID.');
        return;
      }

      setResult(data);
      toast.success('Tracking saved', {
        description: notify
          ? 'The customer has been notified on every channel that is configured.'
          : 'Notifications were skipped.',
      });
      router.refresh();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const alreadySent = order.tracking_id != null;

  return (
    <section
      id="tracking"
      className="scroll-mt-8 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6"
    >
      <h2 className="mb-1 font-headline-md text-headline-md text-deep-maroon">
        {alreadySent ? 'Tracking' : 'Add tracking'}
      </h2>
      <p className="mb-6 font-body-md text-sm text-on-surface-variant">
        {alreadySent
          ? 'Saved. Updating the ID re-sends the notification.'
          : 'Enter the docket number the courier gave you. The customer is notified immediately.'}
      </p>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Tracking ID" htmlFor="tracking-id" error={error} required>
            <Input
              id="tracking-id"
              value={trackingId}
              onChange={(e) => {
                setTrackingId(e.target.value);
                setError(null);
              }}
              placeholder="e.g. 1234567890123"
              autoComplete="off"
            />
          </Field>

          <Field label="Courier" htmlFor="courier" required>
            <Select id="courier" value={courier} onChange={(e) => setCourier(e.target.value)}>
              {COURIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="h-4 w-4 rounded-none border-outline-variant text-deep-maroon focus:ring-primary-container"
          />
          <span className="font-body-md text-sm text-on-surface">
            Notify the customer on WhatsApp, SMS and email
          </span>
        </label>

        <Button type="submit" size="lg" disabled={busy} shine className="w-full sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving & notifying…
            </>
          ) : notify ? (
            'Update & notify customer'
          ) : (
            'Save tracking ID'
          )}
        </Button>
      </form>

      {(result || alreadySent) && (
        <div className="mt-6 space-y-3 border-t border-outline-variant/40 pt-6">
          {result?.trackingUrl && (
            <a
              href={result.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon hover:underline"
            >
              Open tracking page
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {result && (
            <ul className="space-y-2">
              <ChannelRow
                Icon={MessageCircle}
                label="WhatsApp"
                result={result.notifications.whatsapp}
              />
              <ChannelRow Icon={Smartphone} label="SMS" result={result.notifications.sms} />
              <ChannelRow Icon={Mail} label="Email" result={result.notifications.email} />
            </ul>
          )}

          {!result && (
            <ul className="space-y-1 font-body-md text-sm text-on-surface-variant">
              <li>
                WhatsApp:{' '}
                {order.notified_whatsapp_at
                  ? `sent ${formatDateTime(order.notified_whatsapp_at)}`
                  : 'not sent'}
              </li>
              <li>
                SMS:{' '}
                {order.notified_sms_at
                  ? `sent ${formatDateTime(order.notified_sms_at)}`
                  : 'not sent'}
              </li>
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ChannelRow({
  Icon,
  label,
  result,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  result: ChannelResult;
}) {
  return (
    <li className="flex items-start gap-3 font-body-md text-sm">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-on-surface-variant" />
      <span className="w-20 flex-none text-on-surface">{label}</span>
      {result.sent ? (
        <span className="flex items-center gap-1.5 text-success">
          <CheckCircle2 className="h-4 w-4" /> Sent
        </span>
      ) : (
        <span className="flex items-start gap-1.5 text-on-surface-variant">
          <XCircle className="mt-0.5 h-4 w-4 flex-none text-error" />
          <span>{result.skipped ?? result.error ?? 'Not sent'}</span>
        </span>
      )}
    </li>
  );
}
