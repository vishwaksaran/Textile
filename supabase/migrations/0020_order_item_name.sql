-- =====================================================================
-- The name of what was sold, kept on the order line
-- =====================================================================
-- An order line froze its price, size, photograph and tax code, but read
-- its NAME through the product. So a piece that had ever been ordered could
-- never be deleted — the admin hid it instead, and the shop was left with
-- rows it had asked to remove and no way to remove them.
--
-- With the name frozen here, a receipt no longer depends on the product
-- existing at all, and deleting a piece only clears product_id (the foreign
-- key is already ON DELETE SET NULL).
alter table order_items add column if not exists name_at_time text;

comment on column order_items.name_at_time is
  'The product name when this line was bought. Frozen; never re-derived. '
  'Null falls back to the product''s current name.';

-- Every existing line takes what it currently shows, so nothing on an old
-- invoice changes when this runs — or when its product is later deleted.
update order_items oi
set
  name_at_time     = coalesce(oi.name_at_time, p.name),
  image_at_time    = coalesce(oi.image_at_time, p.images[1]),
  hsn_at_time      = coalesce(oi.hsn_at_time, p.hsn_code),
  gst_rate_at_time = coalesce(oi.gst_rate_at_time, p.gst_rate)
from products p
where p.id = oi.product_id
  and (oi.name_at_time is null or oi.image_at_time is null
       or oi.hsn_at_time is null or oi.gst_rate_at_time is null);
