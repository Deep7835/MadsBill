import { round2 } from "@/lib/format";
import { formatPlaceOfSupply, resolveSideStateCode } from "@/lib/gst-states";
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

/**
 * Decides CGST+SGST vs IGST by GST state code, which is what the law actually
 * compares. A GSTIN's first two digits win; failing that the typed state is
 * resolved through the state table, so "UP", "U.P." and "Uttar Pradesh" all
 * land on 09 instead of being compared as raw strings.
 *
 * When the customer's state cannot be resolved at all — blank, or a city typed
 * into the state box — the supply is treated as intra-state. For a local print
 * shop that is overwhelmingly the right guess, and a registered customer is
 * never affected because their GSTIN decides it outright.
 */
export function isIntraState(settings: Settings | null, customer: Customer | null): boolean {
  const supplierCode = resolveSideStateCode(settings?.gst_number, settings?.state);
  const customerCode = resolveSideStateCode(customer?.gst_number, customer?.state);

  if (supplierCode && customerCode) return supplierCode === customerCode;
  return true;
}

/** The place-of-supply state code: the customer's, falling back to the supplier's. */
export function supplyStateCode(
  settings: Settings | null,
  customer: Customer | null,
): string | null {
  return (
    resolveSideStateCode(customer?.gst_number, customer?.state) ??
    resolveSideStateCode(settings?.gst_number, settings?.state)
  );
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
    // Printed as "Uttar Pradesh (09)" — the state and code a GST invoice needs.
    placeOfSupply: formatPlaceOfSupply(
      supplyStateCode(settings, customer),
      customer?.state ?? settings?.state,
    ),
  };
}
