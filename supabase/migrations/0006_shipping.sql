-- =====================================================================
-- Shipping charged by destination, managed from the admin
-- =====================================================================
-- Shipping was a single flat rate for the whole country, which quietly
-- subsidised parcels to Guwahati out of the margin on parcels to Erode. A
-- courier does not charge the same to cross Coimbatore as to reach the
-- north-east, and neither should the shop.
--
-- Three layers, resolved in order: a rate for the specific state if one is
-- set, otherwise the rate for its zone, otherwise the default. Zones exist so
-- "all of north India" is one number rather than eleven, and the per-state
-- override exists so a single awkward destination can be priced without
-- disturbing its neighbours.
--
-- Kept as jsonb maps on a single settings row rather than two side tables:
-- these are small, always read together, always edited on one screen, and a
-- shipping quote must never depend on a join going right.

create table if not exists shipping_settings (
  id             integer primary key default 1 check (id = 1),
  -- Orders at or above this subtotal ship free, whatever the destination.
  free_threshold numeric(10,2) not null default 5000,
  -- Fallback when a state matches no override and no zone.
  default_rate   numeric(10,2) not null default 150,
  -- { "<zone id>": rate } — see SHIPPING_ZONES in lib/shipping.ts.
  zone_rates     jsonb not null default '{}'::jsonb,
  -- { "<state name>": rate } — wins over the zone.
  state_rates    jsonb not null default '{}'::jsonb,
  updated_at     timestamptz default now()
);

insert into shipping_settings (id, zone_rates) values (
  1,
  -- Seeded from the delivery windows already published on /shipping, so the
  -- rates and the promised timings tell the same story from day one.
  '{
     "tamil-nadu": 60,
     "south": 110,
     "west-central": 150,
     "north": 190,
     "east": 190,
     "remote": 260
   }'::jsonb
) on conflict (id) do nothing;

drop trigger if exists shipping_settings_set_updated_at on shipping_settings;
create trigger shipping_settings_set_updated_at before update on shipping_settings
  for each row execute function set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table shipping_settings enable row level security;

-- Readable by anyone: the storefront has to quote a delivery charge before a
-- customer signs in, and the figure is printed on every invoice anyway.
drop policy if exists "Public can view shipping settings" on shipping_settings;
create policy "Public can view shipping settings" on shipping_settings
  for select using (true);

drop policy if exists "Admin full access on shipping settings" on shipping_settings;
create policy "Admin full access on shipping settings" on shipping_settings
  for all using (auth.uid() in (select id from admins));

-- =====================================================================
-- Data API privileges
-- =====================================================================
-- PostgREST checks privileges before RLS, so state these explicitly.
grant select on shipping_settings to anon, authenticated;
grant all    on shipping_settings to service_role;
