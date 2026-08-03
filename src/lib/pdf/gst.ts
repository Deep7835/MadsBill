import { round2 } from "@/lib/format";
import type { Customer, QuotationItem, Settings } from "@/lib/types/database";

/** One row of the rate-wise tax summary printed under the items table. */
export interface TaxSlab {
  rate: number;
  taxable: number;
  /** Half of `tax` when intra-state, else 0. */
  cgst: number;
  sgst: number;
  /** Full `tax` when inter-state, else 0. */
  igst: number;
  tax: number;
}

export interface GstBreakdown {
  /** True when supplier and customer are in the same state — CGST + SGST. */
  intraState: boolean;
  slabs: TaxSlab[];
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  placeOfSupply: string;
}

/** State code is the first two digits of a GSTIN — the reliable comparison. */
function stateCode(gstin: string | null | undefined): string | null {
  const value = (gstin ?? "").trim();
  return /^\d{2}/.test(value) ? value.slice(0, 2) : null;
}

function normaliseState(state: string | null | undefined): string {
  return (state ?? "").trim().toLowerCase();
}

/**
 * Decides CGST+SGST vs IGST. GSTIN state codes win when both sides have one;
 * otherwise the typed state names are compared. With nothing to compare, the
 * supply is treated as intra-state, which is the common case for a local
 * print shop and matches how the totals were computed on screen.
 */
export function isIntraState(settings: Settings | null, customer: Customer | null): boolean {
  const supplierCode = stateCode(settings?.gst_number);
  const customerCode = stateCode(customer?.gst_number);
  if (supplierCode && customerCode) return supplierCode === customerCode;

  const supplierState = normaliseState(settings?.state);
  const customerState = normaliseState(customer?.state);
  if (supplierState && customerState) return supplierState === customerState;

  return true;
}

export function buildGstBreakdown(
  items: QuotationItem[],
  settings: Settings | null,
  customer: Customer | null,
): GstBreakdown {
  const intraState = isIntraState(settings, customer);

  const byRate = new Map<number, { taxable: number; tax: number }>();
  items.forEach((item) => {
    const rate = Number(item.gst_percent ?? 0);
    const taxable = Number(item.amount ?? 0);
    const entry = byRate.get(rate) ?? { taxable: 0, tax: 0 };
    entry.taxable += taxable;
    entry.tax += (taxable * rate) / 100;
    byRate.set(rate, entry);
  });

  const slabs: TaxSlab[] = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, { taxable, tax }]) => ({
      rate,
      taxable: round2(taxable),
      tax: round2(tax),
      cgst: intraState ? round2(tax / 2) : 0,
      sgst: intraState ? round2(tax / 2) : 0,
      igst: intraState ? 0 : round2(tax),
    }));

  const sum = (pick: (slab: TaxSlab) => number) => round2(slabs.reduce((t, s) => t + pick(s), 0));

  return {
    intraState,
    slabs,
    taxable: sum((s) => s.taxable),
    cgst: sum((s) => s.cgst),
    sgst: sum((s) => s.sgst),
    igst: sum((s) => s.igst),
    tax: sum((s) => s.tax),
    placeOfSupply:
      customer?.state?.trim() ||
      settings?.state?.trim() ||
      "—",
  };
}
