import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { CartError, createPendingOrder, priceCart } from '@/lib/orders';
import { isRazorpayConfigured, razorpay, toPaise } from '@/lib/razorpay';
import { STORE } from '@/lib/config';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidPincode,
  normalisePhone,
  shortOrderId,
} from '@/lib/utils';
import type { CheckoutDetails } from '@/types';

export const dynamic = 'force-dynamic';

interface Body {
  items: { productId: string; quantity: number }[];
  customer: CheckoutDetails;
}

function validateCustomer(c: Partial<CheckoutDetails>): string | null {
  if (!c?.name || c.name.trim().length < 2) return 'Please enter your full name.';
  if (!isValidEmail(c.email ?? '')) return 'Please enter a valid email address.';
  if (!isValidIndianPhone(c.phone ?? '')) return 'Please enter a valid 10-digit mobile number.';
  if (!c.address || c.address.trim().length < 8) return 'Please enter your full address.';
  if (!c.city?.trim()) return 'Please enter your city.';
  if (!c.state?.trim()) return 'Please select your state.';
  if (!isValidPincode(c.pincode ?? '')) return 'Please enter a valid 6-digit pincode.';
  return null;
}

/**
 * Creates the Razorpay order and a matching pending row in our database.
 * Amounts are recomputed here — the client only sends ids and quantities.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const customerError = validateCustomer(body.customer ?? {});
  if (customerError) {
    return NextResponse.json({ error: customerError }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const customer: CheckoutDetails = {
    name: body.customer.name.trim(),
    email: body.customer.email.trim().toLowerCase(),
    phone: normalisePhone(body.customer.phone),
    address: body.customer.address.trim(),
    city: body.customer.city.trim(),
    state: body.customer.state.trim(),
    pincode: body.customer.pincode.trim(),
  };

  let cart;
  try {
    cart = await priceCart(
      body.items.map((i) => ({
        productId: String(i.productId),
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 0)),
      })),
    );
  } catch (err) {
    if (err instanceof CartError) {
      return NextResponse.json(
        { error: err.message, productId: err.productId, code: 'CART_INVALID' },
        { status: 409 },
      );
    }
    throw err;
  }

  // Demo mode: no Razorpay keys, so we mint a local reference and let the
  // verify endpoint accept it without a signature.
  if (!isRazorpayConfigured) {
    const reference = `demo_${randomUUID()}`;
    const order = await createPendingOrder({ customer, cart, razorpayOrderId: reference });

    return NextResponse.json({
      demo: true,
      orderId: order.id,
      razorpayOrderId: reference,
      amount: toPaise(cart.total),
      currency: 'INR',
      keyId: null,
      summary: cart,
    });
  }

  try {
    const rzpOrder = await razorpay().orders.create({
      amount: toPaise(cart.total),
      currency: 'INR',
      receipt: `sls_${Date.now().toString(36)}`,
      notes: {
        customer_name: customer.name,
        customer_phone: customer.phone,
        store: STORE.name,
      },
    });

    const order = await createPendingOrder({
      customer,
      cart,
      razorpayOrderId: rzpOrder.id,
    });

    return NextResponse.json({
      demo: false,
      orderId: order.id,
      shortId: shortOrderId(order.id),
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      summary: cart,
    });
  } catch (err) {
    const message = (err as { error?: { description?: string } })?.error?.description;
    return NextResponse.json(
      { error: message ?? 'Could not start the payment. Please try again.' },
      { status: 502 },
    );
  }
}
