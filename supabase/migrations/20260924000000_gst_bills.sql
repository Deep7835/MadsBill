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

create or replace function public.generate_gst_bill(p_quotation_id uuid)
returns public.quotations
language plpgsql
security invoker
as $$
declare
  doc public.quotations;
  n   integer;
begin
  select * into doc from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'Document not found';
  end if;
  if doc.status <> 'invoice' then
    raise exception 'Convert the quotation to an invoice before generating a GST bill';
  end if;
  -- Generating twice is harmless: the bill keeps its first number.
  if doc.bill_number is not null then
    return doc;
  end if;

  insert into public.settings (id) values (1) on conflict (id) do nothing;
  update public.settings
     set gst_bill_counter = gst_bill_counter + 1
   where id = 1
  returning gst_bill_counter into n;

  update public.quotations
     set bill_number = 'MK-' || lpad(n::text, greatest(3, length(n::text)), '0'),
         bill_date   = (now() at time zone 'Asia/Kolkata')::date
   where id = p_quotation_id
  returning * into doc;

  return doc;
end;
$$;

grant execute on function public.generate_gst_bill(uuid) to authenticated;
