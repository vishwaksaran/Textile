-- =====================================================================
-- Structured product attributes, and the Churidars collection
-- =====================================================================
-- Length, fabric and wash care were being typed into the free-text
-- description, which meant three shops' worth of spellings for the same
-- thing — "dry clean only", "Dry Clean Only", "dryclean" — none of which can
-- be filtered, compared, or rendered as a spec table. They are now their own
-- columns, filled from a fixed list in the admin.
--
-- Deliberately plain text rather than an enum: a shop that starts stocking a
-- new weave should not need a migration to sell it. The fixed list lives in
-- lib/product-options.ts, where it is one edit away.
alter table products add column if not exists length     text;
alter table products add column if not exists fabric     text;
alter table products add column if not exists wash_care  text;

comment on column products.length    is 'Cut length, e.g. "6.3 metres (with blouse piece)".';
comment on column products.fabric    is 'Primary fabric, e.g. "Pure Mulberry Silk".';
comment on column products.wash_care is 'Care instruction, e.g. "Dry clean only".';

-- --------------------------------------------------------- new collection
-- Idempotent, matching the pattern in 0002_seed.sql, so re-running is safe.
insert into categories (name, slug, description) values
  ('Churidars', 'churidars',
   'Unstitched churidar and salwar material — cotton, silk cotton and chanderi, with dupatta.')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;
