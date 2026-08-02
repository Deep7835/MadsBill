-- =====================================================================
-- Madskraft Flex & Advertising — seed data
-- Run after schema.sql. Safe to re-run (idempotent on product name).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Company settings (single row)
-- ---------------------------------------------------------------------
insert into public.settings (
  id, company_name, gst_number, address, city, state, phone, email,
  bank_details, terms
) values (
  1,
  'Madskraft Flex & Advertising',
  '09ABCDE1234F1Z5',
  'Shop No. 12, Main Market Road',
  'Noida',
  'Uttar Pradesh',
  '+91 98765 43210',
  'madskraft@example.com',
  E'Bank: HDFC Bank\nA/C Name: Madskraft Flex & Advertising\nA/C No: 1234567890\nIFSC: HDFC0001234\nBranch: Noida Sector 18',
  E'1. Quotation valid for 15 days from the date of issue.\n2. 50% advance payment along with the order, balance before delivery.\n3. Rates are exclusive of transportation and installation unless stated.\n4. Delivery within 3-5 working days after design approval.\n5. Goods once sold will not be taken back.'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------
create unique index if not exists products_name_unique_idx on public.products (name);

-- Flex carries volume slabs: 500+ sq.ft. per piece is Rs.2 cheaper,
-- 1000+ is Rs.4 cheaper. Per-piece print items have no slabs.
insert into public.products (
  name, category, unit, rate_type, default_rate, gst_percent,
  slab1_min_area, slab1_discount, slab2_min_area, slab2_discount
) values
  -- Flex — per sq.ft.
  ('Flex Normal',                'Flex',  'sq.ft.', 'sqft',  12.00, 18,  500, 2, 1000, 4),
  ('Black Back Flex',            'Flex',  'sq.ft.', 'sqft',  18.00, 18,  500, 2, 1000, 4),
  ('Star Flex',                  'Flex',  'sq.ft.', 'sqft',  22.00, 18,  500, 2, 1000, 4),
  ('Backlit Flex',               'Flex',  'sq.ft.', 'sqft',  35.00, 18,  500, 2, 1000, 4),
  ('Vinyl Lamination',           'Flex',  'sq.ft.', 'sqft',  45.00, 18,  500, 2, 1000, 4),
  ('Vinyl Without Lamination',   'Flex',  'sq.ft.', 'sqft',  35.00, 18,  500, 2, 1000, 4),
  ('One Way Vision',             'Flex',  'sq.ft.', 'sqft',  55.00, 18,  500, 2, 1000, 4),
  -- Print — per piece
  ('Visiting Card',              'Print', 'piece',  'piece', 350.00, 18, null, 0, null, 0),
  ('Visiting Card UV',           'Print', 'piece',  'piece', 550.00, 18, null, 0, null, 0),
  ('Visiting Card Lamination',   'Print', 'piece',  'piece', 450.00, 18, null, 0, null, 0),
  ('Pamphlet',                   'Print', 'piece',  'piece',   2.50, 18, null, 0, null, 0),
  ('Bill Book',                  'Print', 'piece',  'piece', 180.00, 18, null, 0, null, 0),
  ('Stamp',                      'Print', 'piece',  'piece', 250.00, 18, null, 0, null, 0)
on conflict (name) do nothing;
