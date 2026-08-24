import { buildInvoicePdf } from '@/lib/invoice';
import { getOrderWithItems } from '@/lib/orders';
import { invoiceNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Streams a freshly rendered invoice. The order id is a UUID, so the link is
 * unguessable and can be emailed to the customer directly.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = await getOrderWithItems(params.id);

  if (!order) {
    return new Response('Invoice not found', { status: 404 });
  }
  if (order.payment_status !== 'paid') {
    return new Response('This order has no invoice yet.', { status: 409 });
  }

  const pdf = buildInvoicePdf(order);
  const filename = `${invoiceNumber(order.id, order.created_at)}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
