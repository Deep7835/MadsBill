-- =====================================================================
-- Madskraft Billing - Invoice HSN/SAC
-- A GST tax invoice must carry an HSN (goods) or SAC (services) code
-- against each line. Printing services share one code across the whole
-- catalogue here, so a single business-wide default is enough.
-- =====================================================================

alter table public.settings
  add column if not exists default_hsn text;

comment on column public.settings.default_hsn is
  'HSN/SAC code printed against every invoice line (e.g. 998912 for printing services)';
