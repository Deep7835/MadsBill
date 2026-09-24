-- =====================================================================
-- Madskraft Billing - Inventory
-- Every product is a stock item. Stock on hand is the sum of its
-- movements: purchases and opening stock add, usage and wastage remove,
-- and invoice lines are deducted automatically by trigger so edits,
-- deletes and quotation -> invoice conversions keep the balance right.
-- Stock is counted in the product's billing unit (sq.ft. or piece).
-- =====================================================================

alter table public.products
  add column if not exists cost_price    numeric(12,2) not null default 0,
  add column if not exists reorder_level numeric(12,2) not null default 0,
  add column if not exists track_stock   boolean       not null default true;

comment on column public.products.cost_price    is 'Internal purchase cost per unit; never printed on documents';
comment on column public.products.reorder_level is 'Warn when stock on hand falls to this level; 0 turns the alert off';
comment on column public.products.track_stock   is 'false for services, which invoices should not deduct';

create table if not exists public.stock_movements (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  kind         text not null check (kind in ('opening', 'purchase', 'usage', 'wastage', 'adjustment', 'invoice')),
  -- Signed: positive adds stock, negative removes it.
  qty          numeric(14,2) not null,
  unit_cost    numeric(12,2),
  date         date not null default ((now() at time zone 'Asia/Kolkata')::date),
  quotation_id uuid references public.quotations(id) on delete cascade,
  supplier     text,
  note         text,
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_stock_movements_product   on public.stock_movements(product_id, date desc);
create index if not exists idx_stock_movements_quotation on public.stock_movements(quotation_id);

alter table public.stock_movements enable row level security;
drop policy if exists "stock_movements_all_authenticated" on public.stock_movements;
create policy "stock_movements_all_authenticated" on public.stock_movements
  for all to authenticated using (true) with check (true);

create or replace view public.product_stock
with (security_invoker = true) as
  select p.id as product_id, coalesce(sum(m.qty), 0)::numeric(14,2) as on_hand
    from public.products p
    left join public.stock_movements m on m.product_id = p.id
   group by p.id;

grant select on public.product_stock to authenticated;

-- Rebuilds one document's invoice deductions from its current lines.
-- Quotations deduct nothing; converting to an invoice deducts.
create or replace function public.sync_invoice_stock(p_quotation_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.stock_movements
   where quotation_id = p_quotation_id and kind = 'invoice';

  insert into public.stock_movements (product_id, kind, qty, date, quotation_id, note)
  select i.product_id,
         'invoice',
         -round(case when i.rate_type = 'sqft' then coalesce(i.area, 0) * i.qty else i.qty end, 2),
         q.date,
         q.id,
         q.quote_number
    from public.quotation_items i
    join public.quotations q on q.id = i.quotation_id
    join public.products p on p.id = i.product_id
   where q.id = p_quotation_id
     and q.status = 'invoice'
     and p.track_stock;
end;
$$;

create or replace function public.trg_quotation_items_stock()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.sync_invoice_stock(old.quotation_id);
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.quotation_id is distinct from old.quotation_id) then
    perform public.sync_invoice_stock(new.quotation_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_quotation_items_stock on public.quotation_items;
create trigger trg_quotation_items_stock
  after insert or update or delete on public.quotation_items
  for each row execute function public.trg_quotation_items_stock();

create or replace function public.trg_quotations_stock()
returns trigger
language plpgsql
as $$
begin
  perform public.sync_invoice_stock(new.id);
  return null;
end;
$$;

drop trigger if exists trg_quotations_stock on public.quotations;
create trigger trg_quotations_stock
  after update of status, date on public.quotations
  for each row
  when (old.status is distinct from new.status or old.date is distinct from new.date)
  execute function public.trg_quotations_stock();
