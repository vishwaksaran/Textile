-- =====================================================================
-- Record when a paid order could not take the stock it needed
-- =====================================================================
-- decrement_stock is atomic, so two buyers racing for the last piece can
-- never both take it and stock can never go negative. What it cannot do is
-- give the loser their money back: the decrement runs after Razorpay has
-- captured, so the second buyer is already paid up when their line fails.
--
-- Before this column that failure existed only as a `stockWarnings` array in
-- the JSON the browser received and discarded. The order looked ordinary in
-- the admin, the customer had a receipt, and nobody knew a refund was owed.
--
-- Named per line rather than as a boolean because a multi-item order can lose
-- one piece and keep the rest, and the shop owner needs to know which.
alter table orders add column if not exists stock_shortfall text[];

comment on column orders.stock_shortfall is
  'Item names a paid order could not reserve. Non-empty means someone was '
  'charged for something that cannot be shipped — refund or substitute.';

-- Partial index: these are rare and always queried as "show me the problems".
create index if not exists orders_stock_shortfall_idx
  on orders (created_at desc)
  where stock_shortfall is not null;
