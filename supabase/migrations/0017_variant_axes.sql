-- =====================================================================
-- Variants along any axis the shop chooses, not just size
-- =====================================================================
-- 0016 gave a product several shelves and called the difference between them
-- "label", which is only ever a size. A shop stocking one design in green and
-- in red, each in four sizes, has twelve shelves and two questions to ask a
-- shopper — and 0016 can hold neither.
--
-- The axes are attributes, the ones that already exist. Colour is an
-- attribute; size becomes one here. A category says which of its attributes
-- make variants, and everything else follows: the product form asks for a
-- grid of those axes, the storefront shows one row of chips per axis, and a
-- shop that later wants to vary sarees by border colour ticks a box rather
-- than asking for a migration.
--
-- Still additive. A product with no variants is untouched, and a product with
-- 0016's single-axis variants is migrated onto the size axis below.

-- --------------------------------------------------- which attributes vary
-- On the join, not on the attribute: colour describes a saree and varies a
-- churidar, and the same row cannot be both for everyone.
alter table category_attributes
  add column if not exists is_variant boolean not null default false;

comment on column category_attributes.is_variant is
  'When true this attribute forms variants for products here: each combination '
  'of its values gets its own stock, SKU and price, instead of one answer per product.';

-- ------------------------------------------------------------ size, at last
-- 0012 left size out on purpose, because a size carried stock and an
-- attribute did not. Now that an attribute can name a variant axis, that
-- reason is gone and the two sources of truth it warned about become one.
insert into attributes (name, slug, input_type, unit, is_filterable, help_text, sort_order)
values ('Size', 'size', 'dropdown_custom', null, true,
        'Each size keeps its own stock. Type a value that is not listed.', 15)
on conflict (slug) do nothing;

insert into attribute_options (attribute_id, value, sort_order)
select a.id, v.value, v.sort_order
from attributes a
cross join (values
  ('XS', 10), ('S', 20), ('M', 30), ('L', 40), ('XL', 50), ('XXL', 60),
  ('Free Size', 70),
  ('36', 100), ('38', 110), ('40', 120), ('42', 130), ('44', 140), ('46', 150)
) as v(value, sort_order)
where a.slug = 'size'
on conflict (attribute_id, value) do nothing;

-- Churidars vary by colour and size. Sarees are left alone deliberately:
-- turning colour into an axis there changes how every existing saree is
-- entered, and that is the shop's decision to make in the Category Manager,
-- not this migration's.
insert into category_attributes (category_id, attribute_id, is_required, sort_order, is_variant)
select c.id, a.id, false, 15, true
from categories c
cross join attributes a
where c.slug in ('churidars', 'dress-materials')
  and a.slug = 'size'
on conflict (category_id, attribute_id) do update set is_variant = true;

update category_attributes ca
set is_variant = true
from categories c, attributes a
where ca.category_id = c.id
  and ca.attribute_id = a.id
  and c.slug in ('churidars', 'dress-materials')
  and a.slug = 'colour';

-- ------------------------------------------------------- what a variant is
-- One row per axis per variant: (this variant, colour, 'Green').
create table if not exists product_variant_options (
  variant_id   uuid not null references product_variants(id) on delete cascade,
  attribute_id uuid not null references attributes(id) on delete restrict,
  value        text not null,
  primary key (variant_id, attribute_id)
);

create index if not exists pvo_attribute_idx
  on product_variant_options (attribute_id, value);

-- The combination, normalised to one string, because "no two variants of a
-- product may share a combination" is not a constraint a child table can
-- state. Written by the application as 'colour:green|size:m', axes sorted.
alter table product_variants add column if not exists option_key text;

comment on column product_variants.option_key is
  'Normalised combination, e.g. colour:green|size:m. Unique per product.';

create unique index if not exists product_variants_option_key
  on product_variants (product_id, option_key) where option_key is not null;

-- label stops being the identity and becomes what is shown and printed:
-- 'Green / M'. Its old uniqueness came from being typed by hand.
drop index if exists product_variants_label_key;

-- ------------------------------------------------- photographs and figures
-- Both belong to one value of one axis, not to a combination.
--
-- Green photographs are the same whether the piece is an M or an L, and the
-- chest measurement of an M is the same in green or in red. Hanging either on
-- the variant would mean entering it once per cell of the grid, and twelve
-- copies of one photo set is twelve chances for one of them to be wrong.
create table if not exists product_option_details (
  product_id   uuid not null references products(id) on delete cascade,
  attribute_id uuid not null references attributes(id) on delete cascade,
  value        text not null,
  -- Swapped into the gallery when this value is chosen. Empty falls back to
  -- the product's own images, which is right for an axis like size that does
  -- not change how a piece looks.
  images       text[] not null default '{}',
  -- Chest, kurta length, shoulder, sleeve — named by the shop.
  measurements jsonb  not null default '{}'::jsonb,
  primary key (product_id, attribute_id, value)
);

-- ------------------------------------------------------------- the backfill
-- 0016's variants are single-axis and that axis is size. Give each one a real
-- option row, an option_key, and move its measurements to where measurements
-- now live. Runs to nothing on a database that has no variants yet.
insert into product_variant_options (variant_id, attribute_id, value)
select v.id, a.id, v.label
from product_variants v
cross join attributes a
where a.slug = 'size'
  and v.option_key is null
  and not exists (
    select 1 from product_variant_options o where o.variant_id = v.id
  )
on conflict (variant_id, attribute_id) do nothing;

insert into product_option_details (product_id, attribute_id, value, measurements)
select v.product_id, a.id, v.label, v.measurements
from product_variants v
cross join attributes a
where a.slug = 'size'
  and v.option_key is null
  and v.measurements <> '{}'::jsonb
on conflict (product_id, attribute_id, value) do nothing;

update product_variants
set option_key = 'size:' || lower(btrim(label))
where option_key is null;

-- measurements on the variant is superseded by product_option_details. Left
-- in place rather than dropped: it still holds the values the backfill copied,
-- and dropping a column is not a step to take in the same deploy that stops
-- reading it.
comment on column product_variants.measurements is
  'Superseded by product_option_details. No longer read; drop once 0017 is live.';

-- ------------------------------------------------------ retired by the above
-- 0016 put a list of suggested sizes on the category. The Size attribute now
-- carries its own options, and two lists of the same thing is one more than
-- can be kept in step.
alter table categories drop column if exists size_presets;

-- ---------------------------------------------------------- per-colour art
-- Variants may carry their own images too, for the rare piece whose one
-- photograph belongs to a whole combination rather than to a single axis.
alter table product_variants add column if not exists images text[] not null default '{}';

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table product_variant_options  enable row level security;
alter table product_option_details   enable row level security;

drop policy if exists "Public can view variant options" on product_variant_options;
create policy "Public can view variant options" on product_variant_options
  for select using (true);

drop policy if exists "Public can view option details" on product_option_details;
create policy "Public can view option details" on product_option_details
  for select using (true);

drop policy if exists "Admin writes variant options" on product_variant_options;
create policy "Admin writes variant options" on product_variant_options
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin writes option details" on product_option_details;
create policy "Admin writes option details" on product_option_details
  for all using (auth.uid() in (select id from admins));

-- PostgREST checks privileges before RLS, so state these explicitly.
grant select on product_variant_options, product_option_details to anon, authenticated;
grant all    on product_variant_options, product_option_details to service_role;
