import { round2 } from "@/lib/format";
import { buildGstBreakdown, type GstBreakdown } from "@/lib/pdf/gst";
import type { Customer, Payment, QuotationItem, Quotation, Settings } from "@/lib/types/database";

/** An invoice with everything the reports need attached. */
export interface ReportInvoice extends Quotation {
  customer: Customer | null;
  items: QuotationItem[];
}

export interface ReportPeriod {
  /** yyyy-MM-dd inclusive. */
  from: string;
  to: string;
}

export interface RegisterRow {
  id: string;
  date: string;
  number: string;
  customer: string;
  gstin: string | null;
  placeOfSupply: string;
  /** B2B when the customer holds a GSTIN, else B2C. */
  segment: "B2B" | "B2C";
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  total: number;
  paymentStatus: Quotation["payment_status"];
}

export interface RateSlabRow {
  rate: number;
  invoices: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
}

export interface ProductRow {
  description: string;
  invoices: number;
  qty: number;
  /** Sq.ft. billed, for area-priced lines. */
  area: number;
  revenue: number;
  avgRate: number;
}

export interface CustomerRow {
  id: string | null;
  name: string;
  gstin: string | null;
  invoices: number;
  revenue: number;
  paid: number;
  outstanding: number;
}

export interface Report {
  period: ReportPeriod;
  register: RegisterRow[];
  totals: {
    invoices: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
    total: number;
    collected: number;
    outstanding: number;
  };
  gstr1: {
    b2b: RateSlabRow[];
    b2c: RateSlabRow[];
    b2bTotal: RateSlabRow;
    b2cTotal: RateSlabRow;
  };
  products: ProductRow[];
  customers: CustomerRow[];
}

const sum = (rows: number[]) => round2(rows.reduce((t, n) => t + n, 0));

/** `invoices` is the distinct count — one invoice can sit in several rate rows. */
function slabTotal(rows: RateSlabRow[], invoices: number): RateSlabRow {
  return {
    rate: 0,
    invoices,
    taxable: sum(rows.map((r) => r.taxable)),
    cgst: sum(rows.map((r) => r.cgst)),
    sgst: sum(rows.map((r) => r.sgst)),
    igst: sum(rows.map((r) => r.igst)),
    tax: sum(rows.map((r) => r.tax)),
  };
}

/** Rate-wise roll-up of a set of invoice breakdowns, the shape GSTR-1 tables use. */
function bySlab(breakdowns: GstBreakdown[]): RateSlabRow[] {
  const map = new Map<number, RateSlabRow>();
  for (const gst of breakdowns) {
    const seen = new Set<number>();
    for (const slab of gst.slabs) {
      const row = map.get(slab.rate) ?? {
        rate: slab.rate,
        invoices: 0,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        tax: 0,
      };
      row.taxable += slab.taxable;
      row.cgst += slab.cgst;
      row.sgst += slab.sgst;
      row.igst += slab.igst;
      row.tax += slab.tax;
      if (!seen.has(slab.rate)) {
        row.invoices += 1;
        seen.add(slab.rate);
      }
      map.set(slab.rate, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => a.rate - b.rate)
    .map((r) => ({
      ...r,
      taxable: round2(r.taxable),
      cgst: round2(r.cgst),
      sgst: round2(r.sgst),
      igst: round2(r.igst),
      tax: round2(r.tax),
    }));
}

/**
 * Everything on the Reports page derives from this one pure function, so the
 * tables, the CSVs and the PDF can never disagree with each other.
 */
export function buildReport(
  period: ReportPeriod,
  invoices: ReportInvoice[],
  payments: Payment[],
  settings: Settings | null,
): Report {
  const breakdowns = new Map(
    invoices.map((inv) => [inv.id, buildGstBreakdown(inv.items, settings, inv.customer)]),
  );

  const register: RegisterRow[] = invoices
    .map((inv) => {
      const gst = breakdowns.get(inv.id)!;
      const gstin = inv.customer?.gst_number?.trim() || null;
      return {
        id: inv.id,
        date: inv.date,
        number: inv.quote_number,
        customer: inv.customer?.business_name ?? "Walk-in Customer",
        gstin,
        placeOfSupply: gst.placeOfSupply,
        segment: gstin ? "B2B" : "B2C",
        taxable: gst.taxable,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        tax: gst.tax,
        total: round2(Number(inv.grand_total)),
        paymentStatus: inv.payment_status,
      } satisfies RegisterRow;
    })
    .sort((a, b) => (a.date === b.date ? a.number.localeCompare(b.number) : a.date.localeCompare(b.date)));

  // A "paid" invoice counts in full; a partial one counts what was recorded against it.
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    if (!p.quotation_id) continue;
    paidByInvoice.set(p.quotation_id, (paidByInvoice.get(p.quotation_id) ?? 0) + Number(p.amount));
  }

  const b2bRows = register.filter((r) => r.segment === "B2B");
  const b2cRows = register.filter((r) => r.segment === "B2C");
  const b2b = bySlab(b2bRows.map((r) => breakdowns.get(r.id)!));
  const b2c = bySlab(b2cRows.map((r) => breakdowns.get(r.id)!));

  /* ---------------------------------------------------------- products */
  const productMap = new Map<string, ProductRow>();
  for (const inv of invoices) {
    const seen = new Set<string>();
    for (const item of inv.items) {
      const key = item.description.trim().toLowerCase();
      const row = productMap.get(key) ?? {
        description: item.description.trim(),
        invoices: 0,
        qty: 0,
        area: 0,
        revenue: 0,
        avgRate: 0,
      };
      row.qty += Number(item.qty);
      row.area += item.rate_type === "sqft" ? Number(item.area ?? 0) * Number(item.qty) : 0;
      row.revenue += Number(item.amount);
      if (!seen.has(key)) {
        row.invoices += 1;
        seen.add(key);
      }
      productMap.set(key, row);
    }
  }
  const products = [...productMap.values()]
    .map((r) => ({
      ...r,
      qty: round2(r.qty),
      area: round2(r.area),
      revenue: round2(r.revenue),
      // Per sq.ft. for area lines, per piece otherwise.
      avgRate: round2(r.area > 0 ? r.revenue / r.area : r.qty > 0 ? r.revenue / r.qty : 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  /* --------------------------------------------------------- customers */
  const customerMap = new Map<string, CustomerRow>();
  for (const inv of invoices) {
    const key = inv.customer?.id ?? "walk-in";
    const row = customerMap.get(key) ?? {
      id: inv.customer?.id ?? null,
      name: inv.customer?.business_name ?? "Walk-in Customer",
      gstin: inv.customer?.gst_number?.trim() || null,
      invoices: 0,
      revenue: 0,
      paid: 0,
      outstanding: 0,
    };
    row.invoices += 1;
    row.revenue += Number(inv.grand_total);
    if (inv.payment_status === "paid") row.paid += Number(inv.grand_total);
    else row.paid += paidByInvoice.get(inv.id) ?? 0;
    customerMap.set(key, row);
  }
  const customers = [...customerMap.values()]
    .map((r) => ({
      ...r,
      revenue: round2(r.revenue),
      paid: round2(Math.min(r.revenue, r.paid)),
      outstanding: round2(Math.max(0, r.revenue - Math.min(r.revenue, r.paid))),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const total = sum(register.map((r) => r.total));
  const collected = sum(customers.map((c) => c.paid));

  return {
    period,
    register,
    totals: {
      invoices: register.length,
      taxable: sum(register.map((r) => r.taxable)),
      cgst: sum(register.map((r) => r.cgst)),
      sgst: sum(register.map((r) => r.sgst)),
      igst: sum(register.map((r) => r.igst)),
      tax: sum(register.map((r) => r.tax)),
      total,
      collected,
      outstanding: round2(total - collected),
    },
    gstr1: { b2b, b2c, b2bTotal: slabTotal(b2b, b2bRows.length), b2cTotal: slabTotal(b2c, b2cRows.length) },
    products,
    customers,
  };
}

/* ----------------------------------------------------------------- CSV */

export type CsvColumn<T> = [label: string, pick: (row: T) => string | number | null | undefined];

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(([label]) => escape(label)).join(",");
  const body = rows.map((row) => columns.map(([, pick]) => escape(pick(row))).join(","));
  return [head, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
