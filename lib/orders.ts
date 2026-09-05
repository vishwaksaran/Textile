import 'server-only';

import { randomUUID } from 'crypto';
import { createAdminSupabase } from '@/lib/supabase/server';
import { getVariantImages } from '@/lib/variants';
import { DEMO_PRODUCTS } from '@/lib/demo-data';
import { STORE } from '@/lib/config';
import { shippingFor } from '@/lib/shipping';
import { getShippingSettings } from '@/lib/shipping-settings';
import { stateCodeFor, stateCodeFromGstin } from '@/lib/tax';
import { effectivePrice } from '@/lib/utils';
import type { CheckoutDetails, Order, OrderItem } from '@/types';

export interface PricedLine {
  productId: string;
  /** Which size was bought. Null for a product that has none. */
  variantId: string | null;
  /** Frozen onto the line, so retiring a size cannot rewrite a receipt. */
  variantLabel: string | null;
  /** The picture the shopper was looking at. Frozen for the same reason. */
  image: string | null;
  name: string;
  /** Frozen onto the order line so a later rate change cannot rewrite it. */
  hsn: string | null;
  gstRate: number | null;
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
 *
 * `state` is the destination, and it changes the delivery charge. It is read
 * here rather than trusted from the request for the same reason the prices
 * are: the browser quotes a figure to show the customer, this is the figure
 * that gets charged, and only one of them is allowed to be authoritative.
 */
export async function priceCart(
  requested: { productId: string; variantId?: string | null; quantity: number }[],
  state?: string | null,
): Promise<PricedCart> {
  if (requested.length === 0) throw new CartError('Your cart is empty.');

  const supabase = createAdminSupabase();
  const ids = requested.map((r) => r.productId);

  const rows = supabase
    ? ((
        await supabase
          .from('products')
          .select('id, name, price, discounted_price, stock_quantity, is_active, hsn_code, gst_rate')
          .in('id', ids)
      ).data ?? [])
    : DEMO_PRODUCTS.filter((p) => ids.includes(p.id));

  /*
    Sizes are read here rather than trusted from the browser, for the same
    reason the prices are: the cart names a variant, and the shelf it points
    at decides both what is available and — where a size is priced
    differently — what it costs.

    Fetched for the whole product, not just the ids the cart named, so a
    variant that has been retired or moved to another product is absent from
    this map and fails the lookup below rather than quietly passing.
  */
  const variantRows = supabase
    ? ((
        await supabase
          .from('product_variants')
          .select('id, product_id, label, price, stock_quantity, is_active')
          .in('product_id', ids)
      ).data ?? [])
    : [];
  const variants = new Map(variantRows.map((v) => [String(v.id), v]));
  const hasVariants = new Set(variantRows.map((v) => String(v.product_id)));

  /*
    The picture each combination stands for, so the line can freeze it.

    Skipped entirely for a cart of one-off pieces, which is most of them —
    there is nothing for it to resolve and no reason to pay for the lookup.
  */
  const variantImages =
    variantRows.length > 0 ? await getVariantImages(ids) : new Map<string, string>();

  const lines: PricedLine[] = requested.map((item) => {
    const product = rows.find((p) => p.id === item.productId);
    if (!product || !product.is_active) {
      throw new CartError('One of these pieces is no longer available.', item.productId);
    }
    if (item.quantity < 1) throw new CartError('Invalid quantity.', item.productId);

    /*
      A product that has sizes can only be bought by the size. A cart line
      naming no variant for such a product is a stale row — the shop added
      sizes after it went into someone's cart — and must be rejected rather
      than fulfilled from a total that no longer describes a single shelf.
    */
    const variant = item.variantId ? variants.get(item.variantId) : undefined;
    if (hasVariants.has(item.productId) && (!variant || variant.product_id !== item.productId)) {
      throw new CartError(
        `${product.name} — please choose a size.`,
        item.productId,
      );
    }
    if (variant && !variant.is_active) {
      throw new CartError(`${product.name} — that size is no longer available.`, item.productId);
    }

    const available = variant ? variant.stock_quantity : (product.stock_quantity ?? 0);
    if (available < item.quantity) {
      const what = variant ? `${product.name} (${variant.label})` : product.name;
      throw new CartError(`${what} — only ${available} left in stock.`, item.productId);
    }

    // A size priced differently overrides the product; almost none are.
    const unitPrice =
      variant && variant.price != null ? Number(variant.price) : effectivePrice(product as never);
    const taxable = product as { hsn_code?: string | null; gst_rate?: number | null };
    return {
      productId: item.productId,
      variantId: variant ? String(variant.id) : null,
      variantLabel: variant ? String(variant.label) : null,
      image:
        (variant ? variantImages.get(String(variant.id)) : null) ??
        (product as { images?: string[] | null }).images?.[0] ??
        null,
      name: product.name as string,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      // Null here means "use the shop-wide default at render time", which is
      // the right answer for a product that has not been given its own code.
      hsn: taxable.hsn_code ?? null,
      gstRate:
        taxable.gst_rate === null || taxable.gst_rate === undefined
          ? null
          : Number(taxable.gst_rate),
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const pieces = lines.reduce((sum, l) => sum + l.quantity, 0);
  const shipping = shippingFor(subtotal, state, await getShippingSettings(), pieces);
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
    // Frozen now, for the same reason as price_at_time: if the shop later
    // registers in another state, historic invoices must keep the split that
    // actually applied when the sale happened.
    is_intra_state: stateCodeFor(input.customer.state) === stateCodeFromGstin(STORE.gstin),
    place_of_supply: input.customer.state ?? null,
  };

  if (!supabase) {
    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      ...base,
      tracking_id: null,
      courier_name: null,
      invoice_url: null,
      stock_shortfall: null,
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
        variant_id: l.variantId,
        variant_at_time: l.variantLabel,
        image_at_time: l.image,
        quantity: l.quantity,
        price_at_time: l.unitPrice,
        hsn_at_time: l.hsn,
        gst_rate_at_time: l.gstRate,
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
      variant_id: l.variantId,
      variant_at_time: l.variantLabel,
      image_at_time: l.image,
      quantity: l.quantity,
      price_at_time: l.unitPrice,
      hsn_at_time: l.hsn,
      gst_rate_at_time: l.gstRate,
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFullOrderId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Resolves the short code a customer can actually see — the `#9BA42876` on
 * their invoice and confirmation — back to the full order id.
 *
 * The phone number is required, and that is the point. A short code is only
 * eight hex characters, so on its own it would be guessable by brute force,
 * and a hit would expose a stranger's name, city and purchases. The full
 * UUID is 122 bits and safe to use alone; this shorter path is deliberately
 * gated on something only the buyer knows.
 *
 * Matching happens on the phone number first — an exact, indexed comparison —
 * and the code is then checked against the id prefix in memory, so a wrong
 * code cannot be used to enumerate orders belonging to that phone number.
 */
export async function findOrderIdByCode(
  code: string,
  phone: string,
): Promise<string | null> {
  const cleanCode = code.trim().replace(/[^0-9a-f]/gi, '').toLowerCase();
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanCode.length < 6 || cleanPhone.length !== 10) return null;

  const supabase = createAdminSupabase();
  if (!supabase) {
    for (const [id, order] of memoryOrders) {
      if (order.customer_phone === cleanPhone && id.toLowerCase().startsWith(cleanCode)) {
        return id;
      }
    }
    return null;
  }

  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_phone', cleanPhone)
    .order('created_at', { ascending: false })
    .limit(50);

  const match = (data ?? []).find((row: { id: string }) =>
    row.id.toLowerCase().startsWith(cleanCode),
  );
  return match?.id ?? null;
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
        return p
          ? { id: p.id, name: p.name, images: p.images, hsn_code: p.hsn_code, gst_rate: p.gst_rate }
          : null;
      })(),
    }));
    return { ...order, order_items: items };
  }

  const { data } = await supabase
    .from('orders')
    .select('*, order_items (*, products:product_id (id, name, images, hsn_code, gst_rate))')
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

  // Named for the shop owner reading the shortfall list, who needs to know
  // which size could not be shipped, not just which product.
  const describe = (line: PricedLine) =>
    line.variantLabel ? `${line.name} (${line.variantLabel})` : line.name;

  if (!supabase) {
    for (const line of lines) {
      const product = DEMO_PRODUCTS.find((p) => p.id === line.productId);
      if (!product || product.stock_quantity < line.quantity) {
        failures.push(describe(line));
        continue;
      }
      product.stock_quantity -= line.quantity;
      product.is_sold_out = product.stock_quantity <= 0;
    }
    return failures;
  }

  for (const line of lines) {
    /*
      Two functions, one contract: zero rows back means the quantity was not
      there. decrement_stock refuses outright for a product that has sizes —
      it would move a total the database maintains as a sum — so a line that
      lost its variant between pricing and capture lands in the shortfall
      list rather than overselling a shelf.
    */
    const { data, error } = line.variantId
      ? await supabase.rpc('decrement_variant_stock', {
          p_variant_id: line.variantId,
          p_qty: line.quantity,
        })
      : await supabase.rpc('decrement_stock', {
          p_product_id: line.productId,
          p_qty: line.quantity,
        });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      failures.push(describe(line));
    }
  }
  return failures;
}

export async function linesForOrder(orderId: string): Promise<PricedLine[]> {
  const order = await getOrderWithItems(orderId);
  if (!order?.order_items) return [];
  return order.order_items.map((item) => ({
    productId: item.product_id ?? '',
    variantId: item.variant_id ?? null,
    // The frozen label, never the live variant — the invoice must read the
    // same next year as it did the day it was issued.
    variantLabel: item.variant_at_time ?? null,
    image: item.image_at_time ?? item.products?.images?.[0] ?? null,
    name: item.products?.name ?? 'Item',
    quantity: item.quantity,
    unitPrice: Number(item.price_at_time),
    lineTotal: Number(item.price_at_time) * item.quantity,
    hsn: item.hsn_at_time ?? item.products?.hsn_code ?? null,
    gstRate:
      item.gst_rate_at_time === null || item.gst_rate_at_time === undefined
        ? (item.products?.gst_rate ?? null)
        : Number(item.gst_rate_at_time),
  }));
}
