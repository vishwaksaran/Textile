import { NextResponse } from 'next/server';
import { findOrderIdByCode } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/**
 * Resolves a short order code plus the buyer's phone number back to the full
 * order id, which the tracking page then fetches as usual.
 *
 * Kept as POST so the code and phone number never land in a URL, a browser
 * history entry, or a server access log.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const phone = typeof body.phone === 'string' ? body.phone : '';

  if (!code.trim()) {
    return NextResponse.json({ error: 'Enter your order ID.' }, { status: 400 });
  }
  if (phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json(
      { error: 'Enter the 10-digit WhatsApp number used on the order.' },
      { status: 400 },
    );
  }

  const id = await findOrderIdByCode(code, phone);
  if (!id) {
    // One message for both "no such code" and "phone does not match", so this
    // cannot be used to discover which order codes exist.
    return NextResponse.json(
      { error: 'No order matches that ID and WhatsApp number.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ id });
}
