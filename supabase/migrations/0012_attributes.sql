-- =====================================================================
-- Attributes: product fields defined as data, not as columns
-- =====================================================================
-- length, fabric and wash_care were three literal columns on products, added
-- when sarees were the only thing sold. Every new product line would have
-- added more, shown on every product regardless — a blouse form asking for a
-- saree length — and each one needing a migration, a form change and a
-- filter change. That does not scale past the second product line.
--
-- Four tables instead:
--
--   attributes                what a field is, and how it is entered
--   attribute_options         the choices, where a field has choices
--   category_attributes       which fields a category asks for
--   product_attribute_values  what one product answered
--
-- A new product section is then rows, not code: create the category, tick
-- the attributes it needs, and its form and filters follow.
--
-- SIZE IS DELIBERATELY ABSENT. Churidar sizes are not a label — each one
-- carries its own stock, SKU, price and measurements, which makes it a
-- variant, not an attribute. Adding it here as well would leave two sources
-- of truth for the same thing, and the wrong one would be the one the
-- checkout believed. It belongs to the variant work.

create table if not exists attributes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  /*
    How the value is captured:
      dropdown        one of the options
      multiselect     any number of the options
      dropdown_custom one of the options, or free text — wash care, where
                      "Dry clean only" covers most pieces and the rest need
                      a sentence
      text            free text
      number          a plain number
      boolean         yes or no
      measurement     a number with a unit, e.g. 44 in
  */
  input_type    text not null default 'dropdown'
                check (input_type in ('dropdown','multiselect','dropdown_custom','text','number','boolean','measurement')),
  /** For `measurement` and `number`: in, cm, m, g. */
  unit          text,
  /** Offered as a filter on the collection page when true. */
  is_filterable boolean not null default false,
  help_text     text,
  sort_order    integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists attribute_options (
  id           uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references attributes(id) on delete cascade,
  value        text not null,
  sort_order   integer not null default 0,
  -- Disabled rather than deleted, so a weave the shop has stopped stocking
  -- leaves the picker without rewriting the products that still carry it.
  is_active    boolean not null default true,
  unique (attribute_id, value)
);

create index if not exists attribute_options_attr_idx
  on attribute_options (attribute_id, sort_order, value);

create table if not exists category_attributes (
  category_id  uuid not null references categories(id) on delete cascade,
  attribute_id uuid not null references attributes(id) on delete cascade,
  is_required  boolean not null default false,
  sort_order   integer not null default 0,
  primary key (category_id, attribute_id)
);

create table if not exists product_attribute_values (
  product_id   uuid not null references products(id) on delete cascade,
  attribute_id uuid not null references attributes(id) on delete cascade,
  /** Single answers, custom text, numbers and booleans, all as text. */
  value        text,
  /** Multi-select answers. Kept apart so a filter can use `&&` on an array. */
  values       text[],
  primary key (product_id, attribute_id)
);

create index if not exists pav_attribute_idx on product_attribute_values (attribute_id, value);

drop trigger if exists attributes_set_updated_at on attributes;
create trigger attributes_set_updated_at before update on attributes
  for each row execute function set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table attributes               enable row level security;
alter table attribute_options        enable row level security;
alter table category_attributes      enable row level security;
alter table product_attribute_values enable row level security;

-- All four are read by the storefront to build forms, specs and filters, and
-- none carries anything private.
drop policy if exists "Public can view attributes" on attributes;
create policy "Public can view attributes" on attributes for select using (true);

drop policy if exists "Public can view attribute options" on attribute_options;
create policy "Public can view attribute options" on attribute_options for select using (true);

drop policy if exists "Public can view category attributes" on category_attributes;
create policy "Public can view category attributes" on category_attributes for select using (true);

drop policy if exists "Public can view product attribute values" on product_attribute_values;
create policy "Public can view product attribute values" on product_attribute_values for select using (true);

drop policy if exists "Admin writes attributes" on attributes;
create policy "Admin writes attributes" on attributes
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin writes attribute options" on attribute_options;
create policy "Admin writes attribute options" on attribute_options
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin writes category attributes" on category_attributes;
create policy "Admin writes category attributes" on category_attributes
  for all using (auth.uid() in (select id from admins));

drop policy if exists "Admin writes product attribute values" on product_attribute_values;
create policy "Admin writes product attribute values" on product_attribute_values
  for all using (auth.uid() in (select id from admins));

-- PostgREST checks privileges before RLS, so state these explicitly.
grant select on attributes, attribute_options, category_attributes, product_attribute_values
  to anon, authenticated;
grant all on attributes, attribute_options, category_attributes, product_attribute_values
  to service_role;
