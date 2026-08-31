export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type CategoryNavGroup = 'sarees' | 'standalone' | 'hidden';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  /** Null for a top-level section; otherwise the section it belongs to. */
  parent_id: string | null;
  /** Whether it appears in the menu. Hidden rows stay reachable by URL. */
  is_visible: boolean;
  /** Portrait card image; falls back to image_url, which is the wide banner. */
  thumbnail_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  /**
   * Attribute slugs whose values create variants for products here.
   * Populated by joins on read; not a column on categories.
   */
  variantAttributes?: string[];
  /**
   * Superseded by is_visible and the tree. Kept until the column is dropped
   * so an older row still reads.
   */
  nav_group: CategoryNavGroup;
  /** Lower sorts first among its siblings; ties fall back to name. */
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
  /**
   * Whether the product has sizes, maintained by the database alongside the
   * stock rollup. Lets a grid card know without fetching the sizes.
   */
  has_variants: boolean;
  /** HSN classification for the tax invoice. Null falls back to the default. */
  hsn_code: string | null;
  /** Per-product GST override. Null falls back to the shop-wide rate. */
  gst_rate: number | null;
  created_at: string;
  updated_at: string;
  /** Populated by joins on read. */
  categories?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  /** Attached when the admin loads a product for editing, keyed by attribute id. */
  attributeValues?: Record<string, { value?: string | null; values?: string[] | null }>;
  /**
   * Sizes, when the product has any.
   *
   * Empty — which is every saree — means stock_quantity is the shelf and
   * there is nothing for a shopper to choose. When it is not empty,
   * stock_quantity is the sum of these, maintained by the database.
   */
  variants?: ProductVariant[];
  /** Attached alongside variants: per-colour photographs, per-size figures. */
  optionDetails?: Record<string, OptionDetail>;
  /**
   * The axes this product varies along, in the order the category lists them.
   * Names travel with them so no client has to look an attribute up.
   */
  variantAxes?: { slug: string; name: string }[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  /** What a shopper reads and the invoice prints: 'Green / M'. */
  label: string;
  /** The combination, normalised: 'colour:green|size:m'. Unique per product. */
  option_key: string;
  /** Axis values by attribute slug: { colour: 'Green', size: 'M' }. */
  options: Record<string, string>;
  sku: string | null;
  stock_quantity: number;
  /** Null means the product's own price, which is the usual case. */
  price: number | null;
  /** For the rare piece photographed per combination rather than per colour. */
  images: string[];
  sort_order: number;
  is_active: boolean;
}

/**
 * Photographs and measurements attached to one value of one axis.
 *
 * Green photographs are the same whether the piece is an M or an L, and an
 * M's chest is the same in green or red — so both hang here rather than on
 * every cell of the grid.
 */
export interface OptionDetail {
  attributeSlug: string;
  value: string;
  images: string[];
  measurements: Record<string, string>;
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
  variant_id: string | null;
  /** The size as printed. Frozen, so retiring a size cannot rewrite a receipt. */
  variant_at_time: string | null;
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
  /**
   * Which size, when the product has any. Null for a saree.
   *
   * Part of the line's identity: an M and an L of the same churidar are two
   * rows in the cart, not one row with a quantity of two.
   */
  variantId: string | null;
  /** Shown beside the name in the cart and frozen onto the order line. */
  variantLabel: string | null;
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
