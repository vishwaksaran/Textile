export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type CategoryNavGroup = 'sarees' | 'standalone' | 'hidden';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  /** Where this collection appears in the main navigation. */
  nav_group: CategoryNavGroup;
  /** Lower sorts first within its nav group; ties fall back to name. */
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  images: string[];
  is_sold_out: boolean;
  is_active: boolean;
  /** Structured spec, chosen from the fixed lists in lib/product-options.ts. */
  length: string | null;
  fabric: string | null;
  wash_care: string | null;
  /** HSN classification for the tax invoice. Null falls back to the default. */
  hsn_code: string | null;
  /** Per-product GST override. Null falls back to the shop-wide rate. */
  gst_rate: number | null;
  created_at: string;
  updated_at: string;
  /** Populated by joins on read. */
  categories?: Pick<Category, 'id' | 'name' | 'slug'> | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price_at_time: number;
  /** Frozen at the sale, like price_at_time — rates and codes change. */
  hsn_at_time: string | null;
  gst_rate_at_time: number | null;
  /** Populated by joins on read. */
  products?: Pick<Product, 'id' | 'name' | 'images' | 'hsn_code' | 'gst_rate'> | null;
}

export interface Order {
  id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string | null;
  customer_state: string | null;
  customer_pincode: string | null;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  tracking_id: string | null;
  courier_name: string | null;
  invoice_url: string | null;
  /** Frozen at the sale so a later change of registration cannot rewrite it. */
  /** Item names a paid order could not reserve — a refund is owed. */
  stock_shortfall: string[] | null;
  is_intra_state: boolean | null;
  place_of_supply: string | null;
  notified_whatsapp_at: string | null;
  notified_sms_at: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface Admin {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  originalPrice: number | null;
  quantity: number;
  maxStock: number;
}

export interface CheckoutDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface TaxSettingsRow {
  id: number;
  gst_rate: number;
  default_hsn: string | null;
  prices_include_tax: boolean;
  show_tax_breakdown: boolean;
  updated_at: string;
}

export interface HeroSlideRow {
  id: string;
  eyebrow: string | null;
  title: string;
  body: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
  /** Where the copy sits on the image, as percentages of the frame. */
  text_x: number;
  text_y: number;
  text_align: 'left' | 'center' | 'right';
  /** False when the artwork already carries its own lettering. */
  show_text: boolean;
  created_at: string;
  updated_at: string;
}
