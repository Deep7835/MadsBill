-- =====================================================================
-- Volume pricing for per-sq.ft. products.
--
-- A large single piece is cheaper per sq.ft.: once the piece reaches a
-- threshold the rate drops by a fixed rupee amount. Two slabs, both
-- configured per product (defaults: 500 sq.ft. -> Rs.2 off, 1000 -> Rs.4).
-- The area tested is the single piece, W x H — quantity does not stack.
-- =====================================================================

alter table public.products
  add column if not exists slab1_min_area numeric(12, 2),
  add column if not exists slab1_discount numeric(12, 2) not null default 0,
  add column if not exists slab2_min_area numeric(12, 2),
  add column if not exists slab2_discount numeric(12, 2) not null default 0;

comment on column public.products.slab1_min_area is
  'Piece area (sq.ft.) at which slab 1 pricing starts. NULL disables the slab.';
comment on column public.products.slab1_discount is
  'Rupees off the rate per sq.ft. once slab 1 applies.';

-- Line items keep both rates: base_rate is what the operator typed,
-- rate is what was actually charged after the slab discount.
alter table public.quotation_items
  add column if not exists base_rate numeric(12, 2);

update public.quotation_items
set base_rate = rate
where base_rate is null;

-- Give every existing per-sq.ft. product the default slabs.
update public.products
set
  slab1_min_area = 500,
  slab1_discount = 2,
  slab2_min_area = 1000,
  slab2_discount = 4
where rate_type = 'sqft'
  and slab1_min_area is null
  and slab2_min_area is null;
