import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { getOrderWithItems, updateOrder } from '@/lib/orders';
import { appUrl, generateCourierTrackingUrl } from '@/lib/config';
import { sendWhatsAppTracking } from '@/lib/notifications/whatsapp';
import { sendSmsTracking } from '@/lib/notifications/sms';
import { sendShippedEmail } from '@/lib/notifications/email';
import { shortOrderId } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Saves the courier's tracking id, flips the order to `shipped`, and tells
 * the customer over WhatsApp, SMS and email.
 *
 * Notification failures do not fail the request — the tracking id is saved
 * either way, and the response reports exactly which channels went out so the
 * admin can retry the ones that did not.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const trackingId = String(body?.trackingId ?? '').trim();
    const courierName = String(body?.courierName ?? '').trim();
    const notify = body?.notify !== false;

    if (!trackingId) {
      return NextResponse.json({ error: 'Enter the tracking ID.' }, { status: 400 });
    }
    if (!courierName) {
      return NextResponse.json({ error: 'Select the courier.' }, { status: 400 });
    }

    const existing = await getOrderWithItems(params.id);
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const nextStatus = existing.order_status === 'delivered' ? 'delivered' : 'shipped';

    await updateOrder(params.id, {
      tracking_id: trackingId,
      courier_name: courierName,
      order_status: nextStatus,
    });

    const order = (await getOrderWithItems(params.id))!;
    const trackingUrl = generateCourierTrackingUrl(courierName, trackingId);

    if (!notify) {
      return NextResponse.json({
        success: true,
        trackingUrl,
        notifications: { whatsapp: { sent: false, skipped: 'notify disabled' } },
      });
    }

    // Every channel here says the order has shipped, so none of them may fire
    // once it is already delivered — the customer has the parcel in hand, and
    // being told it is on its way is worse than being told nothing. Editing a
    // courier reference after delivery is a correction to our own records,
    // not news. The tracking id is still saved; only the message is withheld.
    if (nextStatus !== 'shipped') {
      const skipped = { sent: false, skipped: `order is already ${nextStatus}` };
      return NextResponse.json({
        success: true,
        trackingUrl,
        notifications: { whatsapp: skipped, sms: skipped, email: skipped },
      });
    }

    const [whatsapp, sms, email] = await Promise.all([
      sendWhatsAppTracking({
        phone: order.customer_phone,
        customerName: order.customer_name,
        orderId: shortOrderId(order.id),
        trackingId,
        courierName,
        trackingUrl,
        invoiceUrl: appUrl(`/api/invoice/${order.id}`),
      }),
      sendSmsTracking({
        phone: order.customer_phone,
        orderId: shortOrderId(order.id),
        trackingId,
        courierName,
        trackingUrl,
      }),
      sendShippedEmail(order, trackingUrl),
    ]);

    const now = new Date().toISOString();
    await updateOrder(params.id, {
      ...(whatsapp.sent ? { notified_whatsapp_at: now } : {}),
      ...(sms.sent ? { notified_sms_at: now } : {}),
    });

    return NextResponse.json({
      success: true,
      trackingUrl,
      notifications: { whatsapp, sms, email },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
