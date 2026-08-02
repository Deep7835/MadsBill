import { formatAmount, formatNumber } from "@/lib/format";
import { CURRENCY } from "@/lib/pdf/theme";
import type { QuotationItem } from "@/lib/types/database";

/**
 * Size, area and any volume discount are folded into a grey sub-line under
 * the description. That keeps the table to the four or five columns the
 * printed templates use instead of spraying eight narrow ones across the page.
 */
export function itemDetailLine(item: QuotationItem): string {
  if (item.rate_type !== "sqft") return "";

  const parts = [
    `${formatNumber(Number(item.width ?? 0))} x ${formatNumber(Number(item.height ?? 0))} ft`,
    `${formatNumber(Number(item.area ?? 0))} sq.ft.`,
  ];

  const base = Number(item.base_rate ?? item.rate);
  const charged = Number(item.rate);
  if (base > charged) {
    parts.push(
      `volume rate ${CURRENCY}${formatAmount(base)} to ${CURRENCY}${formatAmount(charged)}/sq.ft.`,
    );
  }

  return parts.join("  |  ");
}

/** "Camera\nDSLR camera with…" — title on line one, details on line two. */
export function itemCell(item: QuotationItem): string {
  const detail = itemDetailLine(item);
  return detail ? `${item.description}\n${detail}` : item.description;
}

export function itemGst(item: QuotationItem): string {
  return `${formatNumber(Number(item.gst_percent), 0)}%`;
}
