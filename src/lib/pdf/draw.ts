import type { jsPDF } from "jspdf";
import { COLORS, type RGB } from "@/lib/pdf/theme";

export interface TextOptions {
  size?: number;
  style?: "normal" | "bold" | "italic";
  color?: RGB;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  lineHeight?: number;
}

/** Draws a rectangle, filled and/or stroked. Returns `y + height` for chaining. */
export function box(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {},
): number {
  const { fill, stroke = COLORS.line, lineWidth = 0.25 } = opts;
  if (fill) doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  doc.setLineWidth(lineWidth);

  const mode = fill && stroke ? "FD" : fill ? "F" : "S";
  doc.rect(x, y, w, h, mode);
  return y + h;
}

export function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color: RGB = COLORS.line) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.25);
  doc.line(x1, y1, x2, y2);
}

/** Single line of text. `y` is the baseline. */
export function text(doc: jsPDF, value: string, x: number, y: number, opts: TextOptions = {}) {
  const { size = 9, style = "normal", color = COLORS.body, align = "left" } = opts;
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(value, x, y, { align });
}

/**
 * Wrapped text. Returns the y just past the last line, so callers can stack
 * blocks without tracking line counts themselves.
 */
export function textBlock(
  doc: jsPDF,
  value: string | null | undefined,
  x: number,
  y: number,
  opts: TextOptions = {},
): number {
  if (!value) return y;
  const {
    size = 9,
    style = "normal",
    color = COLORS.body,
    align = "left",
    maxWidth = 100,
    lineHeight = size * 0.45,
  } = opts;

  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);

  const lines = doc.splitTextToSize(value, maxWidth) as string[];
  lines.forEach((l, i) => doc.text(l, x, y + i * lineHeight, { align }));
  return y + lines.length * lineHeight;
}

/** How tall `textBlock` would be, without drawing it. */
export function measureBlock(
  doc: jsPDF,
  value: string | null | undefined,
  opts: { size?: number; maxWidth?: number; lineHeight?: number } = {},
): number {
  if (!value) return 0;
  const { size = 9, maxWidth = 100, lineHeight = size * 0.45 } = opts;
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(value, maxWidth) as string[];
  return lines.length * lineHeight;
}

/** A grey section bar, as used for "CUSTOMER INFO" / "Bill To" headers. */
export function sectionBar(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  w: number,
  opts: { height?: number; fill?: RGB; color?: RGB; size?: number } = {},
): number {
  const {
    height = 6.5,
    fill = COLORS.bandGrey,
    color = COLORS.ink,
    size = 8.5,
  } = opts;
  box(doc, x, y, w, height, { fill });
  text(doc, label, x + 2.5, y + height / 2 + 1.2, { size, style: "bold", color });
  return y + height;
}

/** Right-aligned label/value pair inside a totals block. */
export function totalRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  opts: { size?: number; style?: "normal" | "bold"; color?: RGB } = {},
) {
  const { size = 9, style = "normal", color = COLORS.ink } = opts;
  text(doc, label, x + 3, y, { size, style, color });
  text(doc, value, x + w - 3, y, { size, style, color, align: "right" });
}
