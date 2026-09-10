"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  CommunicationLog,
  Customer,
  Payment,
  Product,
  Profile,
  Quotation,
  QuotationFull,
  QuotationItem,
  QuotationWithCustomer,
  RateSlabHistory,
  Settings,
} from "@/lib/types/database";

/** Every Supabase call in the app funnels through here so errors are uniform. */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/* ------------------------------------------------------------------ profile & auth */

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
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

export async function fetchProduct(id: string): Promise<Product> {
  const supabase = createClient();
  return unwrap(await supabase.from("products").select("*").eq("id", id).single()) as Product;
}

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

export async function saveProduct(
  values: Record<string, unknown>,
  id?: string,
  slabChangeReason?: string
): Promise<Product> {
  const supabase = createClient();
  
  if (id && (values.default_rate !== undefined || values.slab1_discount !== undefined || values.slab2_discount !== undefined)) {
    // Fetch previous values for slab history tracking
    const { data: oldProduct } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    
    const query = supabase.from("products").update(values).eq("id", id).select().single();
    const updated = unwrap(await query) as Product;

    if (oldProduct) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("rate_slab_history").insert({
        product_id: id,
        product_name: updated.name,
        changed_by: user?.id ?? null,
        old_rate: oldProduct.default_rate,
        new_rate: updated.default_rate,
        old_slabs: {
          slab1_min_area: oldProduct.slab1_min_area,
          slab1_discount: oldProduct.slab1_discount,
          slab2_min_area: oldProduct.slab2_min_area,
          slab2_discount: oldProduct.slab2_discount,
        },
        new_slabs: {
          slab1_min_area: updated.slab1_min_area,
          slab1_discount: updated.slab1_discount,
          slab2_min_area: updated.slab2_min_area,
          slab2_discount: updated.slab2_discount,
        },
        reason: slabChangeReason || "Rate slab update",
      });
    }
    return updated;
  }

  const query = id
    ? supabase.from("products").update(values).eq("id", id).select().single()
    : supabase.from("products").insert(values).select().single();
  return unwrap(await query) as Product;
}

export async function fetchRateSlabHistory(productId?: string): Promise<RateSlabHistory[]> {
  const supabase = createClient();
  let query = supabase.from("rate_slab_history").select("*").order("created_at", { ascending: false });
  if (productId) query = query.eq("product_id", productId);
  return unwrap(await query.limit(50)) as RateSlabHistory[];
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

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("quotation_id", id)
    .order("payment_date", { ascending: false });

  return { ...quotation, items, payments: (payments as Payment[]) ?? [] };
}

export interface QuotationWritePayload {
  quotation: Record<string, unknown>;
  items: Record<string, unknown>[];
}

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

/* ------------------------------------------------------------------ payments */

export async function fetchCustomerPayments(customerId: string): Promise<Payment[]> {
  const supabase = createClient();
  return unwrap(
    await supabase.from("payments").select("*").eq("customer_id", customerId).order("payment_date", { ascending: false })
  ) as Payment[];
}

export async function recordPayment(payload: {
  quotation_id?: string | null;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_no?: string | null;
  notes?: string | null;
}): Promise<Payment> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const payment = unwrap(
    await supabase
      .from("payments")
      .insert({ ...payload, created_by: user?.id ?? null })
      .select()
      .single()
  ) as Payment;

  // Auto update quotation status if payment tied to a specific quotation
  if (payload.quotation_id) {
    const { data: quote } = await supabase.from("quotations").select("grand_total").eq("id", payload.quotation_id).maybeSingle();
    const { data: allPayments } = await supabase.from("payments").select("amount").eq("quotation_id", payload.quotation_id);
    if (quote && allPayments) {
      const totalPaid = (allPayments as { amount: number }[]).reduce(
        (s: number, p) => s + Number(p.amount),
        0
      );
      const grandTotal = Number(quote.grand_total);
      let status: "unpaid" | "partial" | "paid" = "unpaid";
      if (totalPaid >= grandTotal) status = "paid";
      else if (totalPaid > 0) status = "partial";

      await supabase.from("quotations").update({ payment_status: status }).eq("id", payload.quotation_id);
    }
  }

  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = createClient();
  const { data: targetPayment } = await supabase.from("payments").select("quotation_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (targetPayment?.quotation_id) {
    const { data: quote } = await supabase.from("quotations").select("grand_total").eq("id", targetPayment.quotation_id).maybeSingle();
    const { data: allPayments } = await supabase.from("payments").select("amount").eq("quotation_id", targetPayment.quotation_id);
    if (quote) {
      const totalPaid = ((allPayments as { amount: number }[]) ?? []).reduce(
        (s: number, p) => s + Number(p.amount),
        0
      );
      const grandTotal = Number(quote.grand_total);
      let status: "unpaid" | "partial" | "paid" = "unpaid";
      if (totalPaid >= grandTotal) status = "paid";
      else if (totalPaid > 0) status = "partial";

      await supabase.from("quotations").update({ payment_status: status }).eq("id", targetPayment.quotation_id);
    }
  }
}

/* ----------------------------------------------------------- communication logs */

export async function logCommunication(payload: {
  customer_id?: string | null;
  quotation_id?: string | null;
  channel: "sms" | "whatsapp";
  type: string;
  recipient: string;
  message: string;
  status?: "queued" | "sent" | "failed";
  error_msg?: string | null;
}): Promise<CommunicationLog> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return unwrap(
    await supabase
      .from("communication_logs")
      .insert({ ...payload, status: payload.status ?? "sent", created_by: user?.id ?? null })
      .select()
      .single()
  ) as CommunicationLog;
}

export async function fetchCommunicationLogs(customerId?: string): Promise<CommunicationLog[]> {
  const supabase = createClient();
  let query = supabase.from("communication_logs").select("*").order("created_at", { ascending: false });
  if (customerId) query = query.eq("customer_id", customerId);
  return unwrap(await query.limit(50)) as CommunicationLog[];
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
  todaySales: number;
  monthlySales: number;
  totalSales: number;
  pendingAmount: number;
  deliveredCount: number;
  pendingOrdersCount: number;
  recent: QuotationWithCustomer[];
  /** Invoiced revenue per calendar day, for the activity heatmap. */
  activity: ActivityDay[];
}

export interface ActivityDay {
  /** YYYY-MM-DD, as stored by Postgres. */
  date: string;
  total: number;
  count: number;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = createClient();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const firstDayOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [quotationsRes, customersRes, recentRes] = await Promise.all([
    supabase.from("quotations").select("date, status, payment_status, grand_total"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("quotations")
      .select(QUOTATION_LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (quotationsRes.error) throw new Error(quotationsRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);

  const rows = (quotationsRes.data ?? []) as Pick<
    Quotation,
    "date" | "status" | "payment_status" | "grand_total"
  >[];

  const invoices = rows.filter((r) => r.status === "invoice");

  const byDate = new Map<string, ActivityDay>();
  for (const invoice of invoices) {
    if (!invoice.date) continue;
    const day = byDate.get(invoice.date) ?? { date: invoice.date, total: 0, count: 0 };
    day.total += Number(invoice.grand_total ?? 0);
    day.count += 1;
    byDate.set(invoice.date, day);
  }
  const todaySales = invoices
    .filter((r) => r.date === todayStr)
    .reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0);
  
  const monthlySales = invoices
    .filter((r) => r.date >= firstDayOfMonthStr)
    .reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0);

  return {
    quotationCount: rows.filter((r) => r.status === "quotation").length,
    invoiceCount: invoices.length,
    customerCount: customersRes.count ?? 0,
    todaySales,
    monthlySales,
    totalSales: invoices.reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0),
    pendingAmount: invoices
      .filter((r) => r.payment_status !== "paid")
      .reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0),
    deliveredCount: invoices.filter((r) => r.payment_status === "paid").length,
    pendingOrdersCount: invoices.filter((r) => r.payment_status !== "paid").length,
    recent: (recentRes.data ?? []) as unknown as QuotationWithCustomer[],
    activity: [...byDate.values()],
  };
}
