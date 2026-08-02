-- =====================================================================
-- Madskraft Flex & Advertising — Quotation & Billing
-- Supabase schema: tables, indexes, triggers, RLS
-- Run this whole file in the Supabase SQL Editor (once).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type rate_type as enum ('sqft', 'piece');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quotation_status as enum ('quotation', 'invoice');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null,
  contact_person text,
  mobile         text,
  email          text,
  gst_number     text,
  address        text,
  city           text,
  state          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists customers_business_name_idx on public.customers (business_name);
create index if not exists customers_mobile_idx on public.customers (mobile);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text,
  unit         text not null default 'sq.ft.',
  rate_type    rate_type not null default 'sqft',
  default_rate numeric(12, 2) not null default 0,
  gst_percent  numeric(5, 2) not null default 18,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_name_idx on public.products (name);
create index if not exists products_category_idx on public.products (category);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------
create sequence if not exists public.quote_number_seq start 1;

create or replace function public.next_quote_number()
returns text
language sql
volatile
as $$
  select 'MK-' || lpad(nextval('public.quote_number_seq')::text, 4, '0');
$$;

create table if not exists public.quotations (
  id             uuid primary key default gen_random_uuid(),
  quote_number   text not null unique default public.next_quote_number(),
  customer_id    uuid not null references public.customers (id) on delete restrict,
  date           date not null default current_date,
  valid_until    date,
  status         quotation_status not null default 'quotation',
  payment_status payment_status not null default 'unpaid',
  notes          text,
  subtotal       numeric(12, 2) not null default 0,
  gst_amount     numeric(12, 2) not null default 0,
  grand_total    numeric(12, 2) not null default 0,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists quotations_customer_id_idx on public.quotations (customer_id);
create index if not exists quotations_status_idx on public.quotations (status);
create index if not exists quotations_date_idx on public.quotations (date desc);

drop trigger if exists trg_quotations_updated_at on public.quotations;
create trigger trg_quotations_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- quotation_items
-- ---------------------------------------------------------------------
create table if not exists public.quotation_items (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  description  text not null,
  rate_type    rate_type not null default 'sqft',
  width        numeric(10, 2),
  height       numeric(10, 2),
  area         numeric(12, 2),
  qty          numeric(12, 2) not null default 1,
  rate         numeric(12, 2) not null default 0,
  gst_percent  numeric(5, 2) not null default 18,
  amount       numeric(12, 2) not null default 0,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists quotation_items_quotation_id_idx on public.quotation_items (quotation_id);

drop trigger if exists trg_quotation_items_updated_at on public.quotation_items;
create trigger trg_quotation_items_updated_at
  before update on public.quotation_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- settings  (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id            integer primary key default 1,
  company_name  text not null default 'Madskraft Flex & Advertising',
  logo_url      text,
  gst_number    text,
  address       text,
  city          text,
  state         text,
  phone         text,
  email         text,
  website       text,
  bank_details  text,
  terms         text,
  signature_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- Single-tenant back office: every authenticated staff user has access.
-- Anonymous users have none.
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.customers       enable row level security;
alter table public.products        enable row level security;
alter table public.quotations      enable row level security;
alter table public.quotation_items enable row level security;
alter table public.settings        enable row level security;

-- profiles: a user reads/updates only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- customers
drop policy if exists "customers_all_authenticated" on public.customers;
create policy "customers_all_authenticated" on public.customers
  for all to authenticated using (true) with check (true);

-- products
drop policy if exists "products_all_authenticated" on public.products;
create policy "products_all_authenticated" on public.products
  for all to authenticated using (true) with check (true);

-- quotations
drop policy if exists "quotations_all_authenticated" on public.quotations;
create policy "quotations_all_authenticated" on public.quotations
  for all to authenticated using (true) with check (true);

-- quotation_items
drop policy if exists "quotation_items_all_authenticated" on public.quotation_items;
create policy "quotation_items_all_authenticated" on public.quotation_items
  for all to authenticated using (true) with check (true);

-- settings
drop policy if exists "settings_all_authenticated" on public.settings;
create policy "settings_all_authenticated" on public.settings
  for all to authenticated using (true) with check (true);

-- Allow authenticated users to consume the quote number sequence
grant usage, select on sequence public.quote_number_seq to authenticated;
