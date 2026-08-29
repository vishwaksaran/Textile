import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Download, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedPage } from '@/components/shared/motion';
import { getOrderWithItems } from '@/lib/orders';
import { STORE } from '@/lib/config';
import { formatDate, formatINR, shortOrderId } from '@/lib/utils';
import { OrderIdCard } from '@/components/store/order-id-card';

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  if (!searchParams.id) notFound();

  const order = await getOrderWithItems(searchParams.id);
  if (!order) notFound();

  const paid = order.payment_status === 'paid';

  return (
    <AnimatedPage className="container-page py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-container">
              <CheckCircle2 className="h-8 w-8 text-success" strokeWidth={1.5} />
            </span>
          </div>

          <p className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
            {paid ? 'Payment received' : 'Order recorded'}
          </p>
          <h1 className="mb-4 font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[42px]">
            Thank you, {order.customer_name.split(' ')[0]}.
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Your order was placed on {formatDate(order.created_at)}. A confirmation is on its
            way to {order.customer_email}.
          </p>

          {/* The order ID is the customer's only handle on this purchase, so
              give it room and make it trivial to keep rather than burying it
              in a sentence they will scroll past. */}
          <OrderIdCard shortId={shortOrderId(order.id)} fullId={order.id} />
        </div>

        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-headline-md text-headline-md text-deep-maroon">Your order</h2>
            <Badge variant={paid ? 'success' : 'warning'}>
              {paid ? 'Paid' : order.payment_status}
            </Badge>
          </div>

          <ul className="divide-y divide-outline-variant/40">
            {(order.order_items ?? []).map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <div className="relative h-20 w-16 flex-none overflow-hidden rounded bg-surface-variant">
                  {item.products?.images?.[0] && (
                    <Image
                      src={item.products.images[0]}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body-md text-body-md text-on-surface">
                    {item.products?.name ?? 'Handloom piece'}
                  </p>
                  <p className="font-body-md text-sm text-on-surface-variant">
                    Quantity {item.quantity}
                  </p>
                </div>
                <span className="font-body-md text-body-md text-on-surface">
                  {formatINR(Number(item.price_at_time) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-outline-variant/40 pt-4">
            <span className="font-headline-md text-[18px] text-deep-maroon">Total paid</span>
            <span className="font-body-lg text-[18px] font-bold tabular-nums text-deep-maroon">
              {formatINR(Number(order.total_amount))}
            </span>
          </div>

          <div className="mt-6 space-y-1 border-t border-outline-variant/40 pt-6 font-body-md text-sm text-on-surface-variant">
            <p className="font-semibold text-deep-maroon">Shipping to</p>
            <p>{order.customer_name}</p>
            <p>{order.customer_address}</p>
            <p>
              {[order.customer_city, order.customer_state, order.customer_pincode]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p>+91 {order.customer_phone}</p>
          </div>

          {paid && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="flex-1">
                <a href={order.invoice_url ?? `/api/invoice/${order.id}`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
                  Download invoice
                </a>
              </Button>
              <Button asChild className="flex-1" shine>
                <Link href={`/track?id=${order.id}`}>
                  <Package className="h-4 w-4" />
                  Track this order
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-10 rounded-lg bg-surface-container-low p-6">
          <h2 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-deep-maroon">
            <Truck className="h-5 w-5 text-earthy-bronze" strokeWidth={1.5} />
            What happens next
          </h2>
          <ol className="space-y-3 font-body-md text-body-md text-on-surface-variant">
            <Step n={1} text="Your pieces are checked, folded in muslin and packed with the authenticity card." />
            <Step n={2} text="We hand the parcel to the courier, usually within two working days." />
            <Step n={3} text="Tracking details reach you by WhatsApp and SMS the moment it ships." />
          </ol>
          <p className="mt-6 font-body-md text-sm text-on-surface-variant">
            Anything at all — write to{' '}
            <a href={`mailto:${STORE.email}`} className="text-deep-maroon underline">
              {STORE.email}
            </a>{' '}
            or call {STORE.phone}, quoting #{shortOrderId(order.id)}.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Button asChild variant="ghost">
            <Link href="/collections">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </AnimatedPage>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-deep-maroon font-label-sm text-[10px] text-primary-fixed">
        {n}
      </span>
      {text}
    </li>
  );
}
