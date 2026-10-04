-- =====================================================================
-- Enquiries from people who are not ready to buy yet
-- =====================================================================
-- Wholesale was a paragraph telling resellers to phone the shop. A buyer
-- browsing at night, or comparing three suppliers, does not phone — they
-- close the tab, and the shop never learns they were there. This keeps what
-- they told us so someone can call them back.
--
-- Written only by the server (service role) after validation, like orders,
-- so there is deliberately no public insert policy.
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  kind          text not null default 'wholesale'
                  check (kind in ('wholesale', 'retail')),
  name          text not null,
  phone         text not null,
  email         text,
  business_name text,
  city          text,
  interest      text,
  quantity      text,
  message       text,
  -- The piece they were looking at, if they came from a product page. The
  -- name is frozen beside the id so the lead still reads after the product
  -- is renamed or deleted.
  product_id    uuid references products (id) on delete set null,
  product_name  text,
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'converted', 'closed')),
  notes         text
);

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_status_idx on leads (status);

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at before update on leads
  for each row execute function set_updated_at();

alter table leads enable row level security;

drop policy if exists "Admin full access on leads" on leads;
create policy "Admin full access on leads" on leads
  for all using (auth.uid() in (select id from admins));
