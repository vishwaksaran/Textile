export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
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
  /** Populated by joins on read. */
  products?: Pick<Product, 'id' | 'name' | 'images'> | null;
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
