import { round2 } from "@/lib/format";
import type { RateType } from "@/lib/types/database";

type Numeric = number | string | null | undefined;

const num = (v: Numeric): number => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
};

/** Volume pricing: a bigger single piece earns a flat rupee cut per sq.ft. */
export interface RateSlabs {
  slab1_min_area?: Numeric;
  slab1_discount?: Numeric;
  slab2_min_area?: Numeric;
  slab2_discount?: Numeric;
}

export interface SlabResult {
  /** Rupees off the rate, per sq.ft. */
  discount: number;
  /** The area that unlocked it, for labelling. */
  threshold: number | null;
}

/**
 * Area is the *single piece* (width × height) — quantity does not stack, so
 * twelve 50 sq.ft. boards stay at the base rate while one 500 sq.ft. board
 * earns the slab. The higher slab wins when both are met.
 */
export function resolveSlab(area: number, slabs?: RateSlabs | null): SlabResult {
  if (!slabs || !Number.isFinite(area) || area <= 0) return { discount: 0, threshold: null };

  const tiers = [
    { min: num(slabs.slab2_min_area), off: num(slabs.slab2_discount) },
    { min: num(slabs.slab1_min_area), off: num(slabs.slab1_discount) },
  ]
    .filter((tier) => tier.min > 0 && tier.off > 0)
    .sort((a, b) => b.min - a.min);

  const hit = tiers.find((tier) => area >= tier.min);
  return hit ? { discount: hit.off, threshold: hit.min } : { discount: 0, threshold: null };
}

/** Base rate minus the slab discount, never below zero. */
export function effectiveRate(baseRate: Numeric, area: number, slabs?: RateSlabs | null): number {
  const base = num(baseRate);
  const { discount } = resolveSlab(area, slabs);
  return round2(Math.max(0, base - discount));
}

export interface CalcLine {
  rate_type: RateType;
  width?: Numeric;
  height?: Numeric;
  qty?: Numeric;
  /** The rate as typed — before any volume discount. */
  rate?: Numeric;
  gst_percent?: Numeric;
  slabs?: RateSlabs | null;
}

export interface LineResult {
  area: number | null;
  baseRate: number;
  /** What is actually charged, after the slab. */
  rate: number;
  discount: number;
  slabThreshold: number | null;
  amount: number;
  gstAmount: number;
  total: number;
}

/**
 * sqft   → area = width × height, amount = area × qty × effective rate
 * piece  → amount = qty × rate  (width/height and slabs ignored)
 */
export function calcLine(line: CalcLine): LineResult {
  const qty = num(line.qty);
  const baseRate = num(line.rate);
  const gstPercent = num(line.gst_percent);

  let area: number | null = null;
  let rate = baseRate;
  let discount = 0;
  let slabThreshold: number | null = null;
  let amount: number;

  if (line.rate_type === "sqft") {
    area = round2(num(line.width) * num(line.height));
    const slab = resolveSlab(area, line.slabs);
    discount = slab.discount;
    slabThreshold = slab.threshold;
    rate = round2(Math.max(0, baseRate - discount));
    amount = round2(area * qty * rate);
  } else {
    amount = round2(qty * rate);
  }

  const gstAmount = round2((amount * gstPercent) / 100);
  return {
    area,
    baseRate,
    rate,
    discount,
    slabThreshold,
    amount,
    gstAmount,
    total: round2(amount + gstAmount),
  };
}

export interface Totals {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  /** What the volume slabs saved across all lines. */
  savings: number;
}

export function calcTotals(lines: CalcLine[]): Totals {
  const totals = lines.reduce<Totals>(
    (acc, line) => {
      const result = calcLine(line);
      acc.subtotal += result.amount;
      acc.gstAmount += result.gstAmount;
      if (result.discount > 0 && result.area) {
        acc.savings += result.area * num(line.qty) * result.discount;
      }
      return acc;
    },
    { subtotal: 0, gstAmount: 0, grandTotal: 0, savings: 0 },
  );

  totals.subtotal = round2(totals.subtotal);
  totals.gstAmount = round2(totals.gstAmount);
  totals.savings = round2(totals.savings);
  totals.grandTotal = round2(totals.subtotal + totals.gstAmount);
  return totals;
}
