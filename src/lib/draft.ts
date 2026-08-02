import type { RateType } from "@/lib/types/database";

/**
 * Hand-off between the standalone price calculator and the quotation builder.
 * sessionStorage rather than the URL: line items are far too big for a query
 * string, and the draft should die with the tab.
 */
const KEY = "madskraft:draft-items";

export interface DraftItem {
  product_id: string | null;
  description: string;
  rate_type: RateType;
  width: number | string | null;
  height: number | string | null;
  qty: number | string;
  rate: number | string;
  gst_percent: number | string;
}

export function stashDraftItems(items: DraftItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode or a full quota — the builder just starts empty.
  }
}

/** Reads and clears the draft, so a refresh does not resurrect it. */
export function consumeDraftItems(): DraftItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as DraftItem[]) : null;
  } catch {
    return null;
  }
}
