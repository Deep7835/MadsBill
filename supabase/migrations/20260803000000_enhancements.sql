-- =====================================================================
-- Madskraft Billing - Enhancements & Advanced Business Modules
-- Migration: Add stamp_url, upi_id, user roles, rate slab history,
-- payment ledger, and communication logs.
-- =====================================================================

-- 1. Extend settings with stamp_url and UPI ID for payment QR
alter table public.settings
  add column if not exists stamp_url text,
  add column if not exists upi_id text,
  add column if not exists upi_name text,
  add column if not exists sms_api_key text,
  add column if not exists whatsapp_token text;

comment on column public.settings.stamp_url is 'URL of company stamp graphic';
comment on column public.settings.upi_id is 'UPI VPA address for instant payment QR codes';

-- 2. Extend profiles with role
do $$ begin
  create type user_role as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role user_role not null default 'staff';

-- Set first user or admin default
update public.profiles set role = 'admin' where role is null;

-- 3. Rate Slab Change History Table
create table if not exists public.rate_slab_history (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  product_name text not null,
  changed_by   uuid references auth.users (id) on delete set null,
  old_rate     numeric(12, 2),
  new_rate     numeric(12, 2),
  old_slabs    jsonb,
  new_slabs    jsonb,
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists rate_slab_history_product_id_idx on public.rate_slab_history (product_id);
create index if not exists rate_slab_history_created_at_idx on public.rate_slab_history (created_at desc);

-- 4. Customer Payments Ledger
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid references public.quotations (id) on delete set null,
  customer_id  uuid not null references public.customers (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_mode text not null default 'UPI', -- UPI, Cash, Bank Transfer, Cheque
  reference_no text,
  notes        text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists payments_customer_id_idx on public.payments (customer_id);
create index if not exists payments_quotation_id_idx on public.payments (quotation_id);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- 5. Communication Logs (SMS & WhatsApp Reminders)
do $$ begin
  create type comm_channel as enum ('sms', 'whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comm_status as enum ('queued', 'sent', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.communication_logs (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.customers (id) on delete cascade,
  quotation_id uuid references public.quotations (id) on delete set null,
  channel      comm_channel not null,
  type         text not null, -- payment_reminder, invoice, order_ready, delivery
  recipient    text not null,
  message      text not null,
  status       comm_status not null default 'sent',
  error_msg    text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists comm_logs_customer_id_idx on public.communication_logs (customer_id);
create index if not exists comm_logs_created_at_idx on public.communication_logs (created_at desc);

-- 6. Enable RLS
alter table public.rate_slab_history enable row level security;
alter table public.payments          enable row level security;
alter table public.communication_logs enable row level security;

drop policy if exists "rate_slab_history_all_authenticated" on public.rate_slab_history;
create policy "rate_slab_history_all_authenticated" on public.rate_slab_history
  for all to authenticated using (true) with check (true);

drop policy if exists "payments_all_authenticated" on public.payments;
create policy "payments_all_authenticated" on public.payments
  for all to authenticated using (true) with check (true);

drop policy if exists "communication_logs_all_authenticated" on public.communication_logs;
create policy "communication_logs_all_authenticated" on public.communication_logs
  for all to authenticated using (true) with check (true);
