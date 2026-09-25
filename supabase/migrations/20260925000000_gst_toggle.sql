-- =====================================================================
-- Madskraft Billing - GST toggle + editable GST bills
--
-- 1. A document can now be raised with or without GST. Without it, every
--    line is stored at 0% and the totals carry no tax at all - the rate
--    is the final price.
-- 2. GST bill numbers become editable. GST law wants tax-invoice numbers
--    consecutive and permanent, so this is a deliberate override: the
--    unique index still stops two bills sharing a number.
-- =====================================================================

alter table public.quotations
  add column if not exists gst_enabled boolean not null default true;

comment on column public.quotations.gst_enabled is
  'False for a plain bill with no tax: every line is stored at 0% GST and gst_amount is 0.';

-- Documents already carrying no tax were meant to be non-GST, so the new
-- flag should reflect that rather than claiming they are taxed at 0%.
update public.quotations
   set gst_enabled = false
 where gst_amount = 0
   and bill_number is null;

-- ---------------------------------------------------------------------
-- A GST bill only makes sense for a taxed invoice.
-- ---------------------------------------------------------------------
create or replace function public.generate_gst_bill(p_quotation_id uuid)
returns public.quotations
language plpgsql
security invoker
as $$
declare
  doc public.quotations;
  n   integer;
begin
  insert into public.settings (id) values (1) on conflict (id) do nothing;
  -- Locking the settings row makes bill generation one-at-a-time.
  perform 1 from public.settings where id = 1 for update;

  doc := (select q from public.quotations q where q.id = p_quotation_id);
  if doc.id is null then
    raise exception 'Document not found';
  end if;
  if doc.status <> 'invoice' then
    raise exception 'Convert the quotation to an invoice before generating a GST bill';
  end if;
  if not doc.gst_enabled then
    raise exception 'This invoice was raised without GST. Turn GST on before billing it.';
  end if;
  -- Generating twice is harmless: the bill keeps its first number.
  if doc.bill_number is not null then
    return doc;
  end if;

  update public.settings set gst_bill_counter = gst_bill_counter + 1 where id = 1;
  n := (select s.gst_bill_counter from public.settings s where s.id = 1);

  update public.quotations
     set bill_number = 'MK-' || lpad(n::text, greatest(3, length(n::text)), '0'),
         bill_date   = (now() at time zone 'Asia/Kolkata')::date
   where id = p_quotation_id;

  return (select q from public.quotations q where q.id = p_quotation_id);
end;
$$;

grant execute on function public.generate_gst_bill(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Rename / re-date an issued bill. Kept as a function so the blank-number
-- and duplicate cases fail with a message the UI can show verbatim.
-- ---------------------------------------------------------------------
create or replace function public.update_gst_bill(
  p_quotation_id uuid,
  p_bill_number  text,
  p_bill_date    date
)
returns public.quotations
language plpgsql
security invoker
as $$
declare
  doc      public.quotations;
  new_number text := btrim(p_bill_number);
begin
  doc := (select q from public.quotations q where q.id = p_quotation_id);
  if doc.id is null then
    raise exception 'Document not found';
  end if;
  if doc.bill_number is null then
    raise exception 'This invoice has no GST bill yet';
  end if;
  if new_number = '' then
    raise exception 'Bill number cannot be blank';
  end if;
  if exists (
    select 1 from public.quotations q
     where q.bill_number = new_number
       and q.id <> p_quotation_id
  ) then
    raise exception 'Bill number % is already used', new_number;
  end if;

  update public.quotations
     set bill_number = new_number,
         bill_date   = coalesce(p_bill_date, bill_date)
   where id = p_quotation_id;

  return (select q from public.quotations q where q.id = p_quotation_id);
end;
$$;

grant execute on function public.update_gst_bill(uuid, text, date) to authenticated;
