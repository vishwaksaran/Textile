-- =====================================================================
-- Sri Laxmi Silks — initial schema
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- categories
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  image_url   text,
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------------ products
create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  price            numeric(10,2) not null,
  discounted_price numeric(10,2),
  stock_quantity   integer default 0,
  category_id      uuid references categories(id) on delete set null,
  images           text[] default '{}',
  is_sold_out      boolean default false,
  is_active        boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists products_category_idx on products(category_id);
create index if not exists products_active_idx on products(is_active) where is_active = true;

-- -------------------------------------------------------------------- orders
create table if not exists orders (
  id                   uuid primary key default gen_random_uuid(),
  razorpay_order_id    text,
  razorpay_payment_id  text,
  customer_name        text not null,
  customer_email       text not null,
  customer_phone       text not null,
  customer_address     text not null,
  customer_city        text,
  customer_state       text,
  customer_pincode     text,
  total_amount         numeric(10,2),
  payment_status       text default 'pending' check (payment_status in ('pending','paid','failed')),
  order_status         text default 'processing' check (order_status in ('processing','shipped','delivered','cancelled')),
  tracking_id          text,
  courier_name         text,
  invoice_url          text,
  notified_whatsapp_at timestamptz,
  notified_sms_at      timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create unique index if not exists orders_razorpay_order_id_key
  on orders(razorpay_order_id) where razorpay_order_id is not null;
create index if not exists orders_created_idx on orders(created_at desc);
create index if not exists orders_status_idx on orders(order_status);

-- --------------------------------------------------------------- order_items
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  quantity      integer not null,
  price_at_time numeric(10,2) not null
);

create index if not exists order_items_order_idx on order_items(order_id);

-- -------------------------------------------------------------------- admins
-- `id` matches auth.users.id so RLS can compare it against auth.uid().
create table if not exists admins (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text,
  role       text default 'admin',
  created_at timestamptz default now()
);

-- --------------------------------------------------------- updated_at helper
create or replace function set_updated_at()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

-- ----------------------------------------------------- atomic stock decrement
-- Returns zero rows when the requested quantity is unavailable, which the
-- caller treats as "out of stock" rather than silently overselling.
create or replace function decrement_stock(p_product_id uuid, p_qty integer)
returns table(new_stock integer, is_now_sold_out boolean) as $fn$
begin
  return query
  update products
  set stock_quantity = stock_quantity - p_qty,
      is_sold_out    = (stock_quantity - p_qty <= 0),
      updated_at     = now()
  where id = p_product_id and stock_quantity >= p_qty
  returning products.stock_quantity, products.is_sold_out;
end;
$fn$ language plpgsql;

-- ------------------------------------------------------------ dashboard stats
create or replace function admin_dashboard_stats()
returns json as $fn$
  select json_build_object(
    'total_orders',      (select count(*) from orders),
    'paid_orders',       (select count(*) from orders where payment_status = 'paid'),
    'revenue_month',     (select coalesce(sum(total_amount),0) from orders
                            where payment_status = 'paid'
                              and created_at >= date_trunc('month', now())),
    'pending_shipments', (select count(*) from orders
                            where order_status = 'processing' and payment_status = 'paid'),
    'low_stock',         (select count(*) from products
                            where is_active = true and stock_quantity < 5)
  );
$fn$ language sql stable;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table categories  enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table admins      enable row level security;

drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories" on categories
  for select using (true);

drop policy if exists "Public can view active products" on products;
create policy "Public can view active products" on products
  for select using (is_active = true);

drop policy if exists "Admin full access on categories" on categories;
create policy "Admin full access on categories" on categories
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin full access on products" on products;
create policy "Admin full access on products" on products
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin full access on orders" on orders;
create policy "Admin full access on orders" on orders
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin full access on order items" on order_items;
create policy "Admin full access on order items" on order_items
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admins can read own row" on admins;
create policy "Admins can read own row" on admins
  for select using (auth.uid() = id);

-- Orders are written exclusively by the server (service-role key) after the
-- Razorpay signature check, so there is deliberately no public insert policy.

-- =====================================================================
-- Storage buckets
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true),
       ('categories', 'categories', true),
       ('invoices', 'invoices', true)
on conflict (id) do nothing;

drop policy if exists "Public read of store media" on storage.objects;
create policy "Public read of store media" on storage.objects
  for select using (bucket_id in ('products','categories','invoices'));
