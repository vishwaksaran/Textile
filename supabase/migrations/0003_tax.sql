-- =====================================================================
-- GST: tax settings, HSN codes, and per-line tax snapshots
-- =====================================================================
-- A GST-registered seller's tax invoice has to show the HSN code, the
-- taxable value and the tax broken out — CGST+SGST when the buyer is in the
-- seller's own state, IGST otherwise. Before this migration the invoice
-- printed a GSTIN and a lump sum, which reads as a receipt rather than a
-- tax invoice.

-- ------------------------------------------------------------ tax settings
-- Single row. `id` is pinned to 1 by a check constraint so there is exactly
-- one settings record and the admin screen never has to pick between rows.
create table if not exists tax_settings (
  id                 integer primary key default 1 check (id = 1),
  -- Default GST percentage applied to any product without its own rate.
  gst_rate           numeric(5,2) not null default 5.00,
  -- Default HSN, used for products that have not been given one yet.
  default_hsn        text,
  -- Indian retail prices are MRP — the customer pays the listed figure and
  -- tax is extracted from it. Switch off only if you start quoting prices
  -- before tax, which would make the invoice total exceed the amount
  -- Razorpay captured.
  prices_include_tax boolean not null default true,
  -- Set false to hide all tax rows, e.g. before GST registration.
  show_tax_breakdown boolean not null default true,
  updated_at         timestamptz default now()
);

insert into tax_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists tax_settings_set_updated_at on tax_settings;
create trigger tax_settings_set_updated_at before update on tax_settings
  for each row execute function set_updated_at();

-- ------------------------------------------------------------ product tax
-- Both nullable: a product with no HSN falls back to tax_settings.default_hsn,
-- and one with no rate falls back to tax_settings.gst_rate.
alter table products add column if not exists hsn_code text;
alter table products add column if not exists gst_rate numeric(5,2);

-- --------------------------------------------------------- line snapshots
-- Frozen at the moment of sale, exactly like price_at_time. Tax rates and
-- HSN classifications change; a reprinted invoice must show the rate that
-- applied on the day of the sale, not today's.
alter table order_items add column if not exists hsn_at_time      text;
alter table order_items add column if not exists gst_rate_at_time numeric(5,2);

-- Whether the sale was intra-state, frozen at sale time. Derived from the
-- buyer's state against the seller's GSTIN, but stored so a later change of
-- registration cannot rewrite the tax on historic invoices.
alter table orders add column if not exists is_intra_state boolean;
alter table orders add column if not exists place_of_supply text;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table tax_settings enable row level security;

-- Rates are printed on every invoice, so they are not a secret; the
-- storefront reads them to show a tax line at checkout.
drop policy if exists "Public can view tax settings" on tax_settings;
create policy "Public can view tax settings" on tax_settings
  for select using (true);

drop policy if exists "Admin full access on tax settings" on tax_settings;
create policy "Admin full access on tax settings" on tax_settings
  for all using (auth.uid() in (select id from admins));

-- =====================================================================
-- Data API privileges
-- =====================================================================
-- PostgREST checks privileges before RLS, so state these explicitly.
grant select on tax_settings to anon, authenticated;
grant all    on tax_settings to service_role;
