-- =====================================================================
-- Where the banner copy sits on its image
-- =====================================================================
-- The copy was always centred, which assumes the photograph has clear space
-- in the middle. A banner supplied with its own lettering — a title already
-- set into the artwork — then has the site's headline printed straight over
-- it, and both become unreadable.
--
-- Stored as percentages of the frame rather than pixels, because the banner
-- is full-bleed: it is 390px wide on a phone and 2560px on a desktop, and a
-- pixel offset that looked right on one would be off the edge of the other.
alter table hero_slides
  add column if not exists text_x numeric(5,2) not null default 50;

alter table hero_slides
  add column if not exists text_y numeric(5,2) not null default 50;

alter table hero_slides
  add column if not exists text_align text not null default 'center'
  check (text_align in ('left', 'center', 'right'));

-- Some banners arrive with the words already in the picture. For those the
-- honest answer is to print nothing over the top, not to find a gap.
alter table hero_slides
  add column if not exists show_text boolean not null default true;

comment on column hero_slides.text_x is
  'Horizontal centre of the copy, as a percentage of the banner width.';
comment on column hero_slides.show_text is
  'False when the image already carries its own lettering.';
