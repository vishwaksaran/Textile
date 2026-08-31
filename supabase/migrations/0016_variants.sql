-- =====================================================================
-- Sizes: one product, several shelves
-- =====================================================================
-- A saree is one piece. A churidar is an M and an L and an XL, each with its
-- own count on the shelf, its own tag, and its own measurements — and the
-- shop currently has to choose between listing it once and losing the sizes,
-- or listing it four times and losing the product.
--
-- Everything here is additive and nullable. A product with no rows in
-- product_variants behaves exactly as it does today, which is what keeps
-- every saree in the catalogue — and every order already placed — untouched.

-- ------------------------------------------------------------- the variants
create table if not exists product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,

  -- Free text rather than an enum: sizes are 'S'/'M'/'L' for one shop,
  -- '38'/'40'/'42' for another, and 'Free Size' for a good many pieces.
  label          text not null,
  sku            text,

  stock_quantity integer not null default 0 check (stock_quantity >= 0),

  -- Null means "whatever the product costs", which is the answer for almost
  -- every size. Present for the XXL that genuinely costs more.
  price          numeric(10,2),

  -- Chest, length, sleeve — named by the shop, not by this schema, because
  -- the measurements that matter differ by garment. Rendered as the size
  -- table on the product page. Deliberately not an attribute: nobody filters
  -- a catalogue by "chest 40".
  measurements   jsonb not null default '{}'::jsonb,

  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- One row per size per product. Two rows both called 'M' are a data entry
-- slip, and the one thing worse than rejecting it is accepting it and then
-- decrementing the wrong shelf.
create unique index if not exists product_variants_label_key
  on product_variants (product_id, lower(label));

-- Partial, because most shops leave SKUs empty and a plain unique index
-- would then allow exactly one blank row in the whole table.
create unique index if not exists product_variants_sku_key
  on product_variants (sku) where sku is not null;

create index if not exists product_variants_product_idx
  on product_variants (product_id, sort_order);

drop trigger if exists product_variants_set_updated_at on product_variants;
create trigger product_variants_set_updated_at before update on product_variants
  for each row execute function set_updated_at();

-- ------------------------------------------------------ the product rollup
-- A flag the grid can read without a join. The product card, the search
-- dialog and quick-add all need to know that a piece has sizes — quick-add
-- must send the shopper to the page to choose one rather than guessing — and
-- none of them is going to fetch a variant table to find out.
alter table products add column if not exists has_variants boolean not null default false;

-- products.stock_quantity stays the total, maintained here.
--
-- This is what keeps the change small. The sold-out badge, the grid, the
-- search dialog, the low-stock count on the dashboard and the "only 2 left"
-- line all read products.stock_quantity, and none of them has to learn what
-- a variant is — they keep reading one number that is now a sum.
create or replace function sync_product_stock_from_variants()
returns trigger as $fn$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
  v_count   integer;
  v_total   integer;
begin
  select count(*), coalesce(sum(stock_quantity) filter (where is_active), 0)
    into v_count, v_total
    from product_variants
   where product_id = v_product;

  -- No variants left: leave the column alone. Deleting the last size returns
  -- the product to plain stock management holding the total it had, rather
  -- than silently zeroing a shelf that still has cloth on it.
  if v_count = 0 then
    update products set has_variants = false, updated_at = now() where id = v_product;
    return null;
  end if;

  update products
     set stock_quantity = v_total,
         is_sold_out    = (v_total <= 0),
         has_variants   = true,
         updated_at     = now()
   where id = v_product;

  return null;
end;
$fn$ language plpgsql;

drop trigger if exists product_variants_sync_stock on product_variants;
create trigger product_variants_sync_stock
  after insert or update or delete on product_variants
  for each row execute function sync_product_stock_from_variants();

-- --------------------------------------------------------- the order lines
-- variant_id is nullable and every existing row keeps its null, so order
-- history needs no backfill and nothing about a saree order changes.
alter table order_items
  add column if not exists variant_id uuid references product_variants(id) on delete set null;

-- Frozen at the moment of sale, exactly like price_at_time and hsn_at_time.
-- The invoice reads this text and never joins to the live variant: a size
-- renamed or retired next season must not rewrite a receipt already issued.
alter table order_items add column if not exists variant_at_time text;

comment on column order_items.variant_at_time is
  'Size as printed on the invoice. Frozen; never read from the live variant.';

create index if not exists order_items_variant_idx
  on order_items (variant_id) where variant_id is not null;

-- --------------------------------------------------- atomic variant decrement
-- The sibling of decrement_stock, with the same contract: zero rows back
-- means the quantity was not available, which the caller records as a
-- shortfall rather than overselling.
create or replace function decrement_variant_stock(p_variant_id uuid, p_qty integer)
returns table(new_stock integer, is_now_sold_out boolean) as $fn$
begin
  return query
  update product_variants
  set stock_quantity = stock_quantity - p_qty,
      updated_at     = now()
  where id = p_variant_id and stock_quantity >= p_qty
  returning product_variants.stock_quantity, (product_variants.stock_quantity <= 0);
end;
$fn$ language plpgsql;

-- ------------------------------------------------------------- the guardrail
-- decrement_stock now refuses a product that has sizes.
--
-- Without this, a caller that had not been taught about variants would
-- decrement the rollup, the trigger would not fire — it watches the variants,
-- not the product — and the sum would silently disagree with the shelves.
-- Returning zero rows instead routes the failure into stock_shortfall, where
-- someone sees it.
create or replace function decrement_stock(p_product_id uuid, p_qty integer)
returns table(new_stock integer, is_now_sold_out boolean) as $fn$
begin
  return query
  update products
  set stock_quantity = stock_quantity - p_qty,
      is_sold_out    = (stock_quantity - p_qty <= 0),
      updated_at     = now()
  where id = p_product_id
    and stock_quantity >= p_qty
    and not exists (select 1 from product_variants v where v.product_id = p_product_id)
  returning products.stock_quantity, products.is_sold_out;
end;
$fn$ language plpgsql;

-- --------------------------------------------------- sizes the shop offers
-- So the product form can offer S/M/L/XL as chips for a churidar and nothing
-- at all for a saree, without a boolean anywhere that can fall out of step
-- with whether variants actually exist.
alter table categories add column if not exists size_presets text[];

comment on column categories.size_presets is
  'One-click sizes offered when adding variants to a product here. '
  'Null or empty simply means no suggestions — any product may still have sizes.';

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table product_variants enable row level security;

-- Read by the storefront to render the size picker and the size table.
drop policy if exists "Public can view product variants" on product_variants;
create policy "Public can view product variants" on product_variants
  for select using (true);

drop policy if exists "Admin writes product variants" on product_variants;
create policy "Admin writes product variants" on product_variants
  for all using (auth.uid() in (select id from admins));

-- PostgREST checks privileges before RLS, so state these explicitly.
grant select on product_variants to anon, authenticated;
grant all on product_variants to service_role;
