/**
 * Hand-maintained mirror of supabase/schema.sql and migrations.
 */

export type RateType = "sqft" | "piece";
export type QuotationStatus = "quotation" | "invoice";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type UserRole = "admin" | "staff";
export type CommChannel = "sms" | "whatsapp";
export type CommStatus = "queued" | "sent" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
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
  /** Volume pricing, per single piece area. NULL threshold disables the slab. */
  slab1_min_area: number | null;
  slab1_discount: number;
  slab2_min_area: number | null;
  slab2_discount: number;
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
  /** The rate as typed, before any volume discount. */
  base_rate: number | null;
  /** The rate actually charged, after the volume discount. */
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
  stamp_url: string | null;
  signature_url: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bank_details: string | null;
  terms: string | null;
  upi_id: string | null;
  upi_name: string | null;
  sms_api_key: string | null;
  whatsapp_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface RateSlabHistory {
  id: string;
  product_id: string;
  product_name: string;
  changed_by: string | null;
  old_rate: number | null;
  new_rate: number | null;
  old_slabs: Record<string, unknown> | null;
  new_slabs: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  quotation_id: string | null;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_no: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  customer_id: string | null;
  quotation_id: string | null;
  channel: CommChannel;
  type: string;
  recipient: string;
  message: string;
  status: CommStatus;
  error_msg: string | null;
  created_by: string | null;
  created_at: string;
}

/** A quotation joined with its customer — the shape every list page uses. */
export type QuotationWithCustomer = Quotation & {
  customer: Pick<Customer, "id" | "business_name" | "contact_person" | "mobile"> | null;
};

/** A quotation joined with its customer and line items — used by detail + PDF. */
export type QuotationFull = Quotation & {
  customer: Customer | null;
  items: QuotationItem[];
  payments?: Payment[];
};
