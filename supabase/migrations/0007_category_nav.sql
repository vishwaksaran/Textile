-- =====================================================================
-- Where a collection appears in the main navigation
-- =====================================================================
-- Every collection was rendered inside the "Sarees" dropdown, because when
-- the shop sold only sarees that was the same thing. It stopped being true
-- the moment Churidars was added: unstitched salwar material listed under
-- Sarees is simply wrong, and a customer looking for it will not think to
-- open that menu.
--
-- Rather than special-casing one slug in the navbar, placement becomes a
-- property of the collection that the shop owner controls:
--
--   sarees      in the Sarees dropdown  (default — every weave belongs here)
--   standalone  its own top-level item  (a different kind of garment)
--   hidden      not in the nav at all   (still reachable by URL and search)
--
-- `hidden` exists so a seasonal or wholesale-only collection can be taken out
-- of the menu without deleting it and losing the products and the URL.
alter table categories
  add column if not exists nav_group text not null default 'sarees'
  check (nav_group in ('sarees', 'standalone', 'hidden'));

comment on column categories.nav_group is
  'Placement in the main nav: sarees (in the dropdown), standalone (its own '
  'top-level item), or hidden.';

-- Churidars are not sarees.
update categories set nav_group = 'standalone' where slug = 'churidars';

-- Ordering within the nav. Ties fall back to name, so an untouched catalogue
-- still comes out in a stable, predictable order.
alter table categories add column if not exists sort_order integer not null default 0;

create index if not exists categories_nav_idx on categories (nav_group, sort_order, name);
