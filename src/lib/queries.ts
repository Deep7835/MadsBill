"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Customer,
  Product,
  Quotation,
  QuotationFull,
  QuotationItem,
  QuotationWithCustomer,
  Settings,
} from "@/lib/types/database";

/** Every Supabase call in the app funnels through here so errors are uniform. */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/* ------------------------------------------------------------------ customers */

export async function fetchCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  return unwrap(
    await supabase.from("customers").select("*").order("business_name", { ascending: true }),
  ) as Customer[];
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const supabase = createClient();
  return unwrap(await supabase.from("customers").select("*").eq("id", id).single()) as Customer;
}

export async function saveCustomer(
  values: Record<string, unknown>,
  id?: string,
): Promise<Customer> {
  const supabase = createClient();
  const query = id
    ? supabase.from("customers").update(values).eq("id", id).select().single()
    : supabase.from("customers").insert(values).select().single();
  return unwrap(await query) as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------- products */

export async function fetchProducts(): Promise<Product[]> {
  const supabase = createClient();
  return unwrap(
    await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
  ) as Product[];
}

export async function saveProduct(values: Record<string, unknown>, id?: string): Promise<Product> {
  const supabase = createClient();
  const query = id
    ? supabase.from("products").update(values).eq("id", id).select().single()
    : supabase.from("products").insert(values).select().single();
  return unwrap(await query) as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ----------------------------------------------------------------- quotations */

const QUOTATION_LIST_SELECT =
  "*, customer:customers(id, business_name, contact_person, mobile)";

export async function fetchQuotations(filters?: {
  customerId?: string;
  status?: "quotation" | "invoice";
}): Promise<QuotationWithCustomer[]> {
  const supabase = createClient();
  let query = supabase
    .from("quotations")
    .select(QUOTATION_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (filters?.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters?.status) query = query.eq("status", filters.status);

  return unwrap(await query) as unknown as QuotationWithCustomer[];
}

export async function fetchQuotation(id: string): Promise<QuotationFull> {
  const supabase = createClient();
  const quotation = unwrap(
    await supabase
      .from("quotations")
      .select("*, customer:customers(*)")
      .eq("id", id)
      .single(),
  ) as unknown as QuotationFull;

  const items = unwrap(
    await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", id)
      .order("position", { ascending: true }),
  ) as QuotationItem[];

  return { ...quotation, items };
}

export interface QuotationWritePayload {
  quotation: Record<string, unknown>;
  items: Record<string, unknown>[];
}

/**
 * Creates a quotation and its line items. Postgres fills quote_number from a
 * sequence. If the items insert fails the parent row is removed so we never
 * leave an empty quotation (and never burn a quote number silently).
 */
export async function createQuotation({
  quotation,
  items,
}: QuotationWritePayload): Promise<Quotation> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const created = unwrap(
    await supabase
      .from("quotations")
      .insert({ ...quotation, created_by: user?.id ?? null })
      .select()
      .single(),
  ) as Quotation;

  const { error: itemsError } = await supabase
    .from("quotation_items")
    .insert(items.map((item, index) => ({ ...item, quotation_id: created.id, position: index })));

  if (itemsError) {
    await supabase.from("quotations").delete().eq("id", created.id);
    throw new Error(itemsError.message);
  }

  return created;
}

/** Replaces the line items wholesale — simpler and safer than diffing rows. */
export async function updateQuotation(
  id: string,
  { quotation, items }: QuotationWritePayload,
): Promise<Quotation> {
  const supabase = createClient();

  const updated = unwrap(
    await supabase.from("quotations").update(quotation).eq("id", id).select().single(),
  ) as Quotation;

  const { error: deleteError } = await supabase
    .from("quotation_items")
    .delete()
    .eq("quotation_id", id);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase
    .from("quotation_items")
    .insert(items.map((item, index) => ({ ...item, quotation_id: id, position: index })));
  if (insertError) throw new Error(insertError.message);

  return updated;
}

export async function deleteQuotation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function convertToInvoice(id: string): Promise<Quotation> {
  const supabase = createClient();
  return unwrap(
    await supabase
      .from("quotations")
      .update({ status: "invoice" })
      .eq("id", id)
      .select()
      .single(),
  ) as Quotation;
}

export async function updatePaymentStatus(
  id: string,
  payment_status: "unpaid" | "partial" | "paid",
): Promise<Quotation> {
  const supabase = createClient();
  return unwrap(
    await supabase.from("quotations").update({ payment_status }).eq("id", id).select().single(),
  ) as Quotation;
}

/* ------------------------------------------------------------------- settings */

export async function fetchSettings(): Promise<Settings | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Settings | null;
}

export async function saveSettings(values: Record<string, unknown>): Promise<Settings> {
  const supabase = createClient();
  return unwrap(
    await supabase
      .from("settings")
      .upsert({ ...values, id: 1 }, { onConflict: "id" })
      .select()
      .single(),
  ) as Settings;
}

/* ------------------------------------------------------------------ dashboard */

export interface DashboardData {
  quotationCount: number;
  invoiceCount: number;
  customerCount: number;
  totalSales: number;
  pendingAmount: number;
  recent: QuotationWithCustomer[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = createClient();

  const [quotationsRes, customersRes, recentRes] = await Promise.all([
    supabase.from("quotations").select("status, payment_status, grand_total"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("quotations")
      .select(QUOTATION_LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (quotationsRes.error) throw new Error(quotationsRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);

  const rows = (quotationsRes.data ?? []) as Pick<
    Quotation,
    "status" | "payment_status" | "grand_total"
  >[];

  const invoices = rows.filter((r) => r.status === "invoice");

  return {
    quotationCount: rows.filter((r) => r.status === "quotation").length,
    invoiceCount: invoices.length,
    customerCount: customersRes.count ?? 0,
    // Sales counts invoiced work only — quotations are not revenue yet.
    totalSales: invoices.reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0),
    pendingAmount: invoices
      .filter((r) => r.payment_status !== "paid")
      .reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0),
    recent: (recentRes.data ?? []) as unknown as QuotationWithCustomer[],
  };
}
