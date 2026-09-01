'use client';

import * as React from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Loader2, PackageCheck, PackageSearch, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { formatDate, formatINR } from '@/lib/utils';
import { CodeText } from '@/components/ui/code-text';

interface TrackedOrder {
  id: string;
  shortId: string;
  customerName: string;
  customerCity: string | null;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingId: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  items: { name: string; image: string | null; quantity: number; price: number }[];
}

/** A full order id needs no second factor; a short code does. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STAGES = [
  { key: 'processing', label: 'Packed', Icon: PackageSearch },
  { key: 'shipped', label: 'Shipped', Icon: Truck },
  { key: 'delivered', label: 'Delivered', Icon: PackageCheck },
] as const;

export function TrackOrder() {
  const params = useSearchParams();
  const [orderId, setOrderId] = React.useState(params.get('id') ?? '');
  const [order, setOrder] = React.useState<TrackedOrder | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const lookup = React.useCallback(async (id: string, phone = '') => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError('Enter the order ID from your confirmation email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // The full UUID identifies an order on its own. The short code printed
      // on the invoice is only eight characters, so it needs the buyer's
      // phone number alongside it before we will resolve it.
      let fullId = trimmed;
      if (!UUID_RE.test(trimmed)) {
        if (phone.replace(/\D/g, '').length < 10) {
          setOrder(null);
          setError('Also enter the WhatsApp number used on the order.');
          return;
        }
        const res = await fetch('/api/orders/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: trimmed, phone }),
        });
        const data = await res.json();
        if (!res.ok) {
          setOrder(null);
          setError(data.error ?? 'We could not find that order.');
          return;
        }
        fullId = data.id;
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(fullId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        setOrder(null);
        setError(
          res.status === 404
            ? 'We could not find that order. Check the ID and try again.'
            : 'Something went wrong. Please try again in a moment.',
        );
        return;
      }
      const data = await res.json();
      setOrder(data.order);
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // A link carrying a full id opens the order straight away. A link carrying
  // only the short code — as the SMS does, to stay inside one segment and to
  // avoid putting a working order link in a text message — prefills the field
  // and waits for the phone number instead of failing on arrival.
  React.useEffect(() => {
    const fromUrl = params.get('id');
    if (fromUrl && UUID_RE.test(fromUrl.trim())) void lookup(fromUrl);
  }, [params, lookup]);

  const stageIndex = order
    ? Math.max(
        STAGES.findIndex((s) => s.key === order.orderStatus),
        0,
      )
    : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(orderId, phone);
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Field
            label="Order ID"
            htmlFor="order-id"
            error={error}
            className="flex-1"
            hint="The short code from your invoice, like 9BA42876 — or the full ID from your email."
          >
            <Input
              id="order-id"
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                setError(null);
              }}
              placeholder="9BA42876"
              autoComplete="off"
            />
          </Field>

          {/* Only the short code needs a second factor; a full id does not. */}
          {!UUID_RE.test(orderId.trim()) && (
            <Field
              label="WhatsApp number"
              htmlFor="order-phone"
              className="flex-1"
              hint="The number you gave at checkout."
            >
              <Input
                id="order-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                placeholder="9789467448"
                autoComplete="tel"
                maxLength={14}
              />
            </Field>
          )}
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-40">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}
        </Button>
      </form>

      {order && (
        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-headline-md text-headline-md text-deep-maroon">
                Order <CodeText className="text-[22px]">#{order.shortId}</CodeText>
              </h2>
              <p className="font-body-md text-sm text-on-surface-variant">
                Placed {formatDate(order.createdAt)} · {formatINR(order.totalAmount)}
              </p>
            </div>
            <Badge
              variant={
                order.orderStatus === 'delivered'
                  ? 'success'
                  : order.orderStatus === 'cancelled'
                    ? 'error'
                    : 'gold'
              }
            >
              {order.orderStatus}
            </Badge>
          </div>

          {order.orderStatus !== 'cancelled' && (
            <ol className="mb-8 flex items-center">
              {STAGES.map((stage, i) => {
                const reached = i <= stageIndex;
                return (
                  <li key={stage.key} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                          reached
                            ? 'bg-deep-maroon text-primary-fixed'
                            : 'bg-surface-variant text-on-surface-variant'
                        }`}
                      >
                        <stage.Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                        {stage.label}
                      </span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <span
                        className={`mx-2 mb-6 h-px flex-1 ${
                          i < stageIndex ? 'bg-deep-maroon' : 'bg-outline-variant'
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {order.trackingId ? (
            <div className="rounded border border-primary-container/40 bg-primary-container/10 p-4">
              <p className="font-body-md text-sm text-on-surface-variant">
                {order.courierName} · Tracking ID
              </p>
              <CodeText className="block select-all text-[18px] text-deep-maroon">
                {order.trackingId}
              </CodeText>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon hover:underline"
                >
                  Track on {order.courierName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="rounded bg-surface-container-low p-4 font-body-md text-sm text-on-surface-variant">
              Your order is being packed. Tracking details will reach you by WhatsApp and SMS as
              soon as it leaves our store.
            </p>
          )}

          <ul className="mt-6 divide-y divide-outline-variant/40 border-t border-outline-variant/40">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-4 py-3">
                <div className="relative h-14 w-11 flex-none overflow-hidden rounded bg-surface-variant">
                  {item.image && (
                    <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                  )}
                </div>
                <span className="flex-1 font-body-md text-sm text-on-surface">{item.name}</span>
                <span className="font-body-md text-sm text-on-surface-variant">
                  × {item.quantity}
                </span>
              </li>
            ))}
          </ul>

          {order.invoiceUrl && (
            <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
              <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
                Download invoice
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
