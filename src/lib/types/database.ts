/**
 * Hand-maintained mirror of supabase/schema.sql.
 * Regenerate with: npx supabase gen types typescript --project-id <ref>
 */

export type RateType = "sqft" | "piece";
export type QuotationStatus = "quotation" | "invoice";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_name: string;
  contact_person: string | null;
  mobile: string | null;
  email: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  rate_type: RateType;
  default_rate: number;
  gst_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id: string;
  date: string;
  valid_until: string | null;
  status: QuotationStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  description: string;
  rate_type: RateType;
  width: number | null;
  height: number | null;
  area: number | null;
  qty: number;
  rate: number;
  gst_percent: number;
  amount: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: number;
  company_name: string;
  logo_url: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bank_details: string | null;
  terms: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
}

/** A quotation joined with its customer — the shape every list page uses. */
export type QuotationWithCustomer = Quotation & {
  customer: Pick<Customer, "id" | "business_name" | "contact_person" | "mobile"> | null;
};

/** A quotation joined with its customer and line items — used by detail + PDF. */
export type QuotationFull = Quotation & {
  customer: Customer | null;
  items: QuotationItem[];
};
