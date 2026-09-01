-- =====================================================================
-- Madskraft Billing - Product HSN/SAC Code
-- Allow each product to specify its own HSN/SAC code.
-- =====================================================================

alter table public.products
  add column if not exists hsn_code text;

comment on column public.products.hsn_code is
  'Product-specific HSN/SAC code (defaults to business-wide default_hsn if null)';
