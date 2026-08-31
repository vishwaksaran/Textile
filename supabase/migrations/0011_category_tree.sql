-- =====================================================================
-- Categories become a tree, so a section can hold subcategories
-- =====================================================================
-- Until now every category was a sibling of every other, and the only thing
-- separating Sarees from Churidars was nav_group — a flag that says where a
-- row appears in the menu, not what it belongs to. That is enough for one
-- product line and nothing more: there is no way to express
-- "Churidars → 3 Piece" because there is no "under".
--
-- A top-level row (parent_id is null) is a section: Sarees, Churidars, and
-- later Blouses or Lehengas, created from the admin without a deploy. A row
-- with a parent is a subcategory of it.
--
-- Deliberately one table rather than separate `sections` and `categories`
-- tables. A section already needs everything a category has — slug, banner,
-- description, ordering, visibility — and splitting them would mean two
-- managers, two APIs and two sets of rules for the same thing, which is
-- exactly what this is meant to avoid.

alter table categories
  add column if not exists parent_id uuid references categories(id) on delete restrict;

create index if not exists categories_parent_idx on categories (parent_id, sort_order, name);

comment on column categories.parent_id is
  'Null for a top-level section; otherwise the section this belongs to.';

-- `restrict` rather than `cascade`: deleting a section should not silently
-- take its subcategories, and every product filed under them, with it. The
-- admin is told to empty it first, the same way it is told about products.

-- ---------------------------------------------------------------- Sarees
-- The five weaves were top-level because there was nowhere else for them to
-- be. They become children of a Sarees section, which is what the menu has
-- always called them.
insert into categories (name, slug, description, nav_group, sort_order)
values (
  'Sarees',
  'sarees',
  'Handwoven silk and cotton sarees — Kanchipuram, Banarasi, khadi and tissue.',
  'sarees',
  0
)
on conflict (slug) do nothing;

update categories
set parent_id = (select id from categories where slug = 'sarees'),
    nav_group = 'sarees'
where slug in ('banarasi', 'heritage', 'khadi-cotton', 'tissuecotton', 'wedding')
  and parent_id is null;

-- ------------------------------------------------------------ Churidars
-- Already top-level, so it only needs its children and its ordering.
update categories
set nav_group = 'standalone', sort_order = 1
where slug = 'churidars';

insert into categories (name, slug, description, parent_id, sort_order, nav_group)
select v.name, v.slug, v.description, c.id, v.sort_order, 'standalone'
from (values
  ('3 Piece',    '3-piece',    'Top, bottom and dupatta, ready to stitch or wear.',        0),
  ('2 Piece',    '2-piece',    'Top and bottom, without a dupatta.',                        1),
  ('Unstitched', 'unstitched', 'Uncut material by the metre, to be tailored to fit.',       2)
) as v(name, slug, description, sort_order)
cross join (select id from categories where slug = 'churidars') as c
on conflict (slug) do update
  set parent_id  = excluded.parent_id,
      sort_order = excluded.sort_order;

-- A section's own page lists everything beneath it, so /category/sarees and
-- /category/churidars both work without either holding a product directly.
