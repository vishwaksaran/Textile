-- =====================================================================
-- The photograph the shopper was actually looking at
-- =====================================================================
-- An order line already freezes what it must not lose: the price, the HSN
-- code, the tax rate, the size. The picture was not among them, so anything
-- rendering an order — the alert the shop packs from, and whatever comes
-- next — fell back to the product's first image and showed the wrong colour
-- for every piece bought in a second one.
--
-- It cannot be derived after the fact either. Images hang off the values of
-- an axis, and a value renamed or a photograph replaced next season would
-- quietly rewrite what a receipt from today appears to show.
--
-- Frozen text, like variant_at_time beside it. Null on every existing row,
-- which reads as "fall back to the product" and is exactly what those orders
-- did before.
alter table order_items add column if not exists image_at_time text;

comment on column order_items.image_at_time is
  'The image shown when this line was bought. Frozen; never re-derived. '
  'Null falls back to the product''s own first image.';
