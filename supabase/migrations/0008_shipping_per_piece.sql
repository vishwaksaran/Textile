-- =====================================================================
-- Shipping charged per piece, not per order
-- =====================================================================
-- The rate was one figure for the whole order, so two sarees to Chennai
-- cost the same to send as one. The courier does not work that way and
-- neither does the shop: Tamil Nadu is Rs.60 for the first piece and Rs.30
-- for each after it, and everywhere else is Rs.80 a piece with no discount
-- for the second.
--
-- Two rates per zone rather than a multiplier, because those two rules are
-- genuinely different shapes — one tapers, the other does not — and a single
-- "per piece" number cannot express both. Setting the pair equal gives plain
-- per-piece pricing; setting the extra lower gives the tapering kind.
alter table shipping_settings
  add column if not exists default_extra_rate numeric(10,2) not null default 80;

alter table shipping_settings
  add column if not exists zone_extra_rates jsonb not null default '{}'::jsonb;

alter table shipping_settings
  add column if not exists state_extra_rates jsonb not null default '{}'::jsonb;

comment on column shipping_settings.zone_extra_rates is
  'Rate for each piece after the first, keyed by zone id. Equal to '
  'zone_rates means flat per-piece pricing.';

-- The rates the shop actually charges.
update shipping_settings
set free_threshold   = 5000,
    default_rate     = 80,
    default_extra_rate = 80,
    zone_rates       = '{"tamil-nadu":60,"south":80,"west-central":80,"north":80,"east":80,"remote":80}'::jsonb,
    zone_extra_rates = '{"tamil-nadu":30,"south":80,"west-central":80,"north":80,"east":80,"remote":80}'::jsonb
where id = 1;
