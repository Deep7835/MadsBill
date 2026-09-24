-- =====================================================================
-- Madskraft Billing - GST bills
-- An invoice can be issued as a GST bill with its own number series:
-- MK-001, MK-002, ... GST rules want tax-invoice numbers to be
-- consecutive, so the counter lives on the settings row and is bumped
-- inside the same transaction that stamps the invoice. A sequence would
-- leave gaps whenever a call fails.
-- =====================================================================

alter table public.quotations
  add column if not exists bill_number text unique,
  add column if not exists bill_date   date;

alter table public.settings
  add column if not exists gst_bill_counter integer not null default 0;

comment on column public.quotations.bill_number is 'GST bill number (MK-001...), set once by generate_gst_bill()';
comment on column public.settings.gst_bill_counter is 'Last GST bill number issued';

-- Written without SELECT ... INTO: the Supabase SQL editor mistakes that
-- for a table being created and injects ALTER TABLE lines into the body.
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
