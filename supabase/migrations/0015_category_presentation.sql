-- =====================================================================
-- Categories carry their own presentation and their own order
-- =====================================================================
-- Four gaps left over from the tree work, all of which force a deploy for
-- something a shop owner should own.

-- ------------------------------------------------------------ visibility
-- nav_group meant two things at once: which menu a row belonged to, and
-- whether it appeared at all. The tree answers the first — a row's parent is
-- its menu — leaving 'sarees' and 'standalone' as labels that no longer mean
-- anything, and 'hidden' as the only value still doing work.
--
-- A boolean says the one thing that is left to say. nav_group stays for now
-- so a rollback has somewhere to land; it is dropped once this is live.
alter table categories
  add column if not exists is_visible boolean not null default true;

update categories set is_visible = (nav_group is distinct from 'hidden');

comment on column categories.is_visible is
  'Whether this appears in the menu. Hidden rows stay reachable by URL.';

-- --------------------------------------------------------------- imagery
-- One image was serving both the 21:9 banner across the top of a collection
-- page and the 3:4 card on the home page. No photograph is well composed for
-- both, so one of the two was always badly cropped.
alter table categories add column if not exists thumbnail_url text;

comment on column categories.thumbnail_url is
  'Portrait card image. Falls back to image_url, which is the wide banner.';

-- ------------------------------------------------------------------- SEO
-- The collection page builds its title and description from the category
-- name, which is right until a shop wants to rank for a phrase that is not
-- its own menu label.
alter table categories add column if not exists seo_title text;
alter table categories add column if not exists seo_description text;

-- ---------------------------------------------------------------- order
-- sort_order has existed since 0007 and has never been settable: rows came
-- out in whatever order they were created, and the menu with them.
create index if not exists categories_sibling_order_idx
  on categories (parent_id, sort_order, name);

-- Give existing rows distinct positions so the first reorder has somewhere
-- to move from — every one currently sits at 0, where swapping two changes
-- nothing.
with ordered as (
  select id,
         row_number() over (
           partition by parent_id
           order by sort_order, created_at, name
         ) * 10 as position
  from categories
)
update categories c
set sort_order = ordered.position
from ordered
where ordered.id = c.id;
