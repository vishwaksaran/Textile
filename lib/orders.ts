import 'server-only';

import { randomUUID } from 'crypto';
import { createAdminSupabase } from '@/lib/supabase/server';
import { DEMO_PRODUCTS } from '@/lib/demo-data';
import { shippingFor } from '@/lib/config';
import { effectivePrice } from '@/lib/utils';
import type { CheckoutDetails, Order, OrderItem } from '@/types';

export interface PricedLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
}

export class CartError extends Error {
  constructor(
    message: string,
    readonly productId?: string,
  ) {
    super(message);
    this.name = 'CartError';
  }
}

/**
 * Re-prices a cart from authoritative product rows. The browser never gets to
 * decide what anything costs — it only sends product ids and quantities.
 */
export async function priceCart(
  requested: { productId: string; quantity: number }[],
): Promise<PricedCart> {
  if (requested.length === 0) throw new CartError('Your cart is empty.');

  const supabase = createAdminSupabase();
  const ids = requested.map((r) => r.productId);

  const rows = supabase
    ? ((
        await supabase
          .from('products')
          .select('id, name, price, discounted_price, stock_quantity, is_active')
          .in('id', ids)
      ).data ?? [])
    : DEMO_PRODUCTS.filter((p) => ids.includes(p.id));

  const lines: PricedLine[] = requested.map((item) => {
    const product = rows.find((p) => p.id === item.productId);
    if (!product || !product.is_active) {
      throw new CartError('One of these pieces is no longer available.', item.productId);
    }
    if (item.quantity < 1) throw new CartError('Invalid quantity.', item.productId);
    if ((product.stock_quantity ?? 0) < item.quantity) {
      throw new CartError(
        `${product.name} — only ${product.stock_quantity ?? 0} left in stock.`,
        item.productId,
      );
    }

    const unitPrice = effectivePrice(product as never);
    return {
      productId: item.productId,
      name: product.name as string,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = shippingFor(subtotal);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

// ---------------------------------------------------------------------------
// In-memory fallback store, used only when Supabase has no service-role key.
// Good enough to demo the whole payment flow on a dev machine; it does not
// survive a restart, which is exactly why it is never used in production.
// ---------------------------------------------------------------------------
const memoryOrders = new Map<string, Order>();
const memoryItems = new Map<string, OrderItem[]>();

export const usingMemoryOrders = !createAdminSupabase();

export async function createPendingOrder(input: {
  customer: CheckoutDetails;
  cart: PricedCart;
  razorpayOrderId: string | null;
}): Promise<Order> {
  const supabase = createAdminSupabase();

  const base = {
    razorpay_order_id: input.razorpayOrderId,
    razorpay_payment_id: null,
    customer_name: input.customer.name,
    customer_email: input.customer.email,
    customer_phone: input.customer.phone,
    customer_address: input.customer.address,
    customer_city: input.customer.city,
    customer_state: input.customer.state,
    customer_pincode: input.customer.pincode,
    total_amount: input.cart.total,
    payment_status: 'pending' as const,
    order_status: 'processing' as const,
  };

  if (!supabase) {
    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      ...base,
      tracking_id: null,
      courier_name: null,
      invoice_url: null,
      notified_whatsapp_at: null,
      notified_sms_at: null,
      created_at: now,
      updated_at: now,
    };
    memoryOrders.set(order.id, order);
    memoryItems.set(
      order.id,
      input.cart.lines.map((l) => ({
        id: randomUUID(),
        order_id: order.id,
        product_id: l.productId,
        quantity: l.quantity,
        price_at_time: l.unitPrice,
      })),
    );
    return order;
  }

  const { data, error } = await supabase.from('orders').insert(base).select().single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create the order.');

  const { error: itemsError } = await supabase.from('order_items').insert(
    input.cart.lines.map((l) => ({
      order_id: data.id,
      product_id: l.productId,
      quantity: l.quantity,
      price_at_time: l.unitPrice,
    })),
  );
  if (itemsError) throw new Error(itemsError.message);

  return data as Order;
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return (
      [...memoryOrders.values()].find((o) => o.razorpay_order_id === razorpayOrderId) ?? null
    );
  }

  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();
  return (data as Order) ?? null;
}

export async function getOrderWithItems(id: string): Promise<Order | null> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    const order = memoryOrders.get(id);
    if (!order) return null;
    const items = (memoryItems.get(id) ?? []).map((item) => ({
      ...item,
      products: (() => {
        const p = DEMO_PRODUCTS.find((d) => d.id === item.product_id);
        return p ? { id: p.id, name: p.name, images: p.images } : null;
      })(),
    }));
    return { ...order, order_items: items };
  }

  const { data } = await supabase
    .from('orders')
    .select('*, order_items (*, products:product_id (id, name, images))')
    .eq('id', id)
    .maybeSingle();
  return (data as Order) ?? null;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    const existing = memoryOrders.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
    memoryOrders.set(id, next);
    return next;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Order;
}

/**
 * Decrements stock for each line atomically. Reports any line that could not
 * be fulfilled rather than throwing — the payment has already succeeded by
 * this point, so the order must still be recorded.
 */
export async function commitStock(lines: PricedLine[]): Promise<string[]> {
  const supabase = createAdminSupabase();
  const failures: string[] = [];

  if (!supabase) {
    for (const line of lines) {
      const product = DEMO_PRODUCTS.find((p) => p.id === line.productId);
      if (!product || product.stock_quantity < line.quantity) {
        failures.push(line.name);
        continue;
      }
      product.stock_quantity -= line.quantity;
      product.is_sold_out = product.stock_quantity <= 0;
    }
    return failures;
  }

  for (const line of lines) {
    const { data, error } = await supabase.rpc('decrement_stock', {
      p_product_id: line.productId,
      p_qty: line.quantity,
    });
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      failures.push(line.name);
    }
  }
  return failures;
}

export async function linesForOrder(orderId: string): Promise<PricedLine[]> {
  const order = await getOrderWithItems(orderId);
  if (!order?.order_items) return [];
  return order.order_items.map((item) => ({
    productId: item.product_id ?? '',
    name: item.products?.name ?? 'Item',
    quantity: item.quantity,
    unitPrice: Number(item.price_at_time),
    lineTotal: Number(item.price_at_time) * item.quantity,
  }));
}
