-- =====================================================================
-- Home page banner slides, editable from the admin
-- =====================================================================
-- The three slides were hardcoded, so featuring a piece meant a code change
-- and a deploy — which is the wrong shape for the thing that changes most
-- often in a shop. It also went stale silently: one slide still linked to
-- /category/kanchipuram months after that collection was deleted, sending
-- everyone who clicked it to a 404 on the busiest button on the site.
--
-- Ordered by sort_order then created_at, so a new slide lands predictably at
-- the end rather than wherever the database felt like returning it.
create table if not exists hero_slides (
  id         uuid primary key default gen_random_uuid(),
  -- Small line above the headline, e.g. "From the Southern Looms".
  eyebrow    text,
  title      text not null,
  body       text,
  image_url  text not null,
  cta_label  text,
  cta_href   text,
  sort_order integer not null default 0,
  -- Lets a seasonal slide be kept and switched off out of season, rather
  -- than deleted and retyped next year.
  is_active  boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists hero_slides_order_idx
  on hero_slides (sort_order, created_at)
  where is_active = true;

drop trigger if exists hero_slides_set_updated_at on hero_slides;
create trigger hero_slides_set_updated_at before update on hero_slides
  for each row execute function set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table hero_slides enable row level security;

drop policy if exists "Public can view active slides" on hero_slides;
create policy "Public can view active slides" on hero_slides
  for select using (is_active = true);

drop policy if exists "Admin full access on hero slides" on hero_slides;
create policy "Admin full access on hero slides" on hero_slides
  for all using (auth.uid() in (select id from admins));

-- =====================================================================
-- Data API privileges
-- =====================================================================
-- PostgREST checks privileges before RLS, so state these explicitly.
grant select on hero_slides to anon, authenticated;
grant all    on hero_slides to service_role;
