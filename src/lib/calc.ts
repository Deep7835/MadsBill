import { round2 } from "@/lib/format";
import type { RateType } from "@/lib/types/database";

export interface CalcLine {
  rate_type: RateType;
  width?: number | string | null;
  height?: number | string | null;
  qty?: number | string | null;
  rate?: number | string | null;
  gst_percent?: number | string | null;
}

export interface LineResult {
  area: number | null;
  amount: number;
  gstAmount: number;
  total: number;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
};

/**
 * sqft   → area = width × height (sq.ft.), amount = area × qty × rate
 * piece  → amount = qty × rate  (width/height ignored)
 */
export function calcLine(line: CalcLine): LineResult {
  const qty = num(line.qty) || 0;
  const rate = num(line.rate);
  const gstPercent = num(line.gst_percent);

  let area: number | null = null;
  let amount: number;

  if (line.rate_type === "sqft") {
    area = round2(num(line.width) * num(line.height));
    amount = round2(area * qty * rate);
  } else {
    amount = round2(qty * rate);
  }

  const gstAmount = round2((amount * gstPercent) / 100);
  return { area, amount, gstAmount, total: round2(amount + gstAmount) };
}

export interface Totals {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export function calcTotals(lines: CalcLine[]): Totals {
  const totals = lines.reduce<Totals>(
    (acc, line) => {
      const { amount, gstAmount } = calcLine(line);
      acc.subtotal += amount;
      acc.gstAmount += gstAmount;
      return acc;
    },
    { subtotal: 0, gstAmount: 0, grandTotal: 0 },
  );

  totals.subtotal = round2(totals.subtotal);
  totals.gstAmount = round2(totals.gstAmount);
  totals.grandTotal = round2(totals.subtotal + totals.gstAmount);
  return totals;
}
