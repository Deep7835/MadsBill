-- Migration for Daily Job Sheet entries
CREATE TABLE IF NOT EXISTS public.job_sheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  mobile TEXT,
  product_name TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  size TEXT,
  qty NUMERIC NOT NULL DEFAULT 1,
  total_sale NUMERIC NOT NULL DEFAULT 0,
  advance_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'In Production',
  customer_type TEXT DEFAULT 'New',
  primary_staff TEXT,
  payment_mode TEXT DEFAULT 'UPI',
  delivery_date DATE,
  actual_delivery_date DATE,
  direct_cost NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.job_sheet_entries ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can select job_sheet_entries"
  ON public.job_sheet_entries FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert job_sheet_entries"
  ON public.job_sheet_entries FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update job_sheet_entries"
  ON public.job_sheet_entries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job_sheet_entries"
  ON public.job_sheet_entries FOR DELETE
  TO authenticated USING (true);

-- Index for fast queries by date and job_number
CREATE INDEX IF NOT EXISTS idx_job_sheet_entries_date ON public.job_sheet_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_job_sheet_entries_job_number ON public.job_sheet_entries(job_number);
