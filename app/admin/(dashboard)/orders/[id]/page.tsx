import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, Mail, MapPin, Phone, Printer, TriangleAlert } from 'lucide-react';
import { CodeText } from '@/components/ui/code-text';
import { AdminHeader, AdminPage, OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/ui';
import { TrackingForm } from '@/components/admin/tracking-form';
import { OrderStatusControl } from '@/components/admin/order-status-control';
import { Button } from '@/components/ui/button';
import { getOrderWithItems } from '@/lib/orders';
import { generateCourierTrackingUrl } from '@/lib/config';
import { describeItem, formatDateTime, formatINR, invoiceNumber, shortOrderId } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Order' };
export const dynamic = 'force-dynamic';

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  // The layout renders the setup notice; skip the queries that would throw.
  if (!isSupabaseConfigured) return null;

  const order = await getOrderWithItems(params.id);
  if (!order) notFound();

  const items = order.order_items ?? [];
  const subtotal = items.reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);
  const shipping = Math.max(Number(order.total_amount ?? subtotal) - subtotal, 0);
  const invoiceHref = `/api/invoice/${order.id}`;

  return (
    <AdminPage>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
        <Link href="/admin/orders">
          <ArrowLeft className="h-4 w-4" />
          All orders
        </Link>
      </Button>

      <AdminHeader
        title="Order Detail"
        subtitle={`Placed ${formatDateTime(order.created_at)}`}
        code={`#${shortOrderId(order.id)}`}
        codeSecondary={invoiceNumber(order.id, order.created_at)}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={invoiceHref} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5" />
                Invoice
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={invoiceHref} target="_blank" rel="noreferrer">
                <Printer className="h-3.5 w-3.5" />
                Print
              </a>
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PaymentStatusBadge status={order.payment_status} />
        <OrderStatusBadge status={order.order_status} />
        {order.razorpay_payment_id && (
          <span className="font-body-md text-xs text-on-surface-variant">
            Payment ID: {order.razorpay_payment_id}
          </span>
        )}
      </div>

      {/* Money was taken for something that cannot be shipped, so this sits
          above everything else on the page rather than in a status pill. */}
      {order.stock_shortfall && order.stock_shortfall.length > 0 && (
        <div className="mb-6 rounded-lg border-2 border-error bg-error-container/30 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-headline-md text-headline-md text-error">
            <TriangleAlert className="h-5 w-5" strokeWidth={2} />
            Paid, but out of stock
          </h2>
          <p className="font-body-md text-body-md text-on-surface">
            This order was paid, but another customer took the last of{' '}
            <strong>{order.stock_shortfall.join(', ')}</strong> first. Nothing was reserved
            for it.
          </p>
          <p className="mt-2 font-body-md text-body-md text-on-surface">
            Call {order.customer_name} on +91 {order.customer_phone} to offer a substitute
            or a refund, then refund in the Razorpay dashboard if they want their money
            back. Do not ship this order as it stands.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
            <h2 className="border-b border-outline-variant/40 px-6 py-4 font-headline-md text-headline-md text-deep-maroon">
              Items
            </h2>
            <ul className="divide-y divide-outline-variant/30">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-6 py-4">
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
                    {item.product_id ? (
                      <Link
                        href={`/admin/products/${item.product_id}`}
                        className="font-body-md text-body-md text-deep-maroon hover:underline"
                      >
                        {describeItem(item)}
                      </Link>
                    ) : (
                      <span className="font-body-md text-body-md text-on-surface">
                        {describeItem(item)}
                      </span>
                    )}
                    <p className="font-body-md text-sm text-on-surface-variant">
                      {formatINR(Number(item.price_at_time))} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-body-md text-body-md text-on-surface">
                    {formatINR(Number(item.price_at_time) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-outline-variant/40 px-6 py-4 font-body-md text-sm">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="text-on-surface">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Shipping</dt>
                <dd className="text-on-surface">
                  {shipping === 0 ? 'Free' : formatINR(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-outline-variant/40 pt-2">
                <dt className="font-headline-md text-[17px] text-deep-maroon">Total</dt>
                <dd className="font-body-lg text-[17px] font-bold tabular-nums text-deep-maroon">
                  {formatINR(Number(order.total_amount))}
                </dd>
              </div>
            </dl>
          </section>

          <TrackingForm order={order} />
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
            <h2 className="mb-4 font-headline-md text-headline-md text-deep-maroon">Customer</h2>
            <p className="font-body-md text-body-md text-on-surface">{order.customer_name}</p>

            <ul className="mt-4 space-y-3 font-body-md text-sm text-on-surface-variant">
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.5} />
                <a href={`tel:+91${order.customer_phone}`} className="hover:text-deep-maroon">
                  +91 {order.customer_phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.5} />
                <a href={`mailto:${order.customer_email}`} className="hover:text-deep-maroon">
                  {order.customer_email}
                </a>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.5} />
                <span>
                  {order.customer_address}
                  <br />
                  {[order.customer_city, order.customer_state, order.customer_pincode]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </li>
            </ul>

            <a
              href={`https://wa.me/91${order.customer_phone}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon hover:underline"
            >
              Message on WhatsApp
            </a>
          </section>

          <section className="space-y-5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6">
            <h2 className="font-headline-md text-headline-md text-deep-maroon">Fulfilment</h2>
            <OrderStatusControl order={order} />

            {order.tracking_id && (
              <div className="space-y-1 border-t border-outline-variant/40 pt-4 font-body-md text-sm">
                <p className="text-on-surface-variant">{order.courier_name}</p>
                <CodeText className="block select-all text-on-surface">
                  {order.tracking_id}
                </CodeText>
                <a
                  href={generateCourierTrackingUrl(order.courier_name!, order.tracking_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block pt-1 font-label-sm text-label-sm uppercase tracking-widest text-deep-maroon hover:underline"
                >
                  Track parcel
                </a>
              </div>
            )}

            <div className="space-y-1 border-t border-outline-variant/40 pt-4 font-body-md text-xs text-on-surface-variant">
              <p>
                WhatsApp notified:{' '}
                {order.notified_whatsapp_at ? formatDateTime(order.notified_whatsapp_at) : '—'}
              </p>
              <p>
                SMS notified:{' '}
                {order.notified_sms_at ? formatDateTime(order.notified_sms_at) : '—'}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AdminPage>
  );
}
