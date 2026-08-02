export type RGB = [number, number, number];

/** A4 portrait, millimetres. Deliberately not `as const` — these are cursor
 *  seeds that callers assign into `let` counters. */
export const PAGE: { width: number; height: number; margin: number } = {
  width: 210,
  height: 297,
  margin: 12,
};

export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
export const CONTENT_RIGHT = PAGE.width - PAGE.margin;
/**
 * Where the body must stop. The page border is drawn at `margin - 2` and the
 * footer sits outside it, so the body can run to the border and no further.
 */
export const PAGE_BORDER_BOTTOM = PAGE.height - (PAGE.margin - 2);
export const BODY_BOTTOM = PAGE_BORDER_BOTTOM - 2;

export const COLORS = {
  navy: [30, 58, 138] as RGB,
  accent: [37, 99, 235] as RGB,
  ink: [17, 24, 39] as RGB,
  body: [55, 65, 81] as RGB,
  muted: [107, 114, 128] as RGB,
  line: [148, 163, 184] as RGB,
  hairline: [203, 213, 225] as RGB,
  bandGrey: [237, 240, 245] as RGB,
  totalsFill: [197, 213, 246] as RGB,
  white: [255, 255, 255] as RGB,
} as const;

export const FONT = {
  title: 26,
  company: 15,
  section: 9.5,
  body: 9,
  small: 8.2,
  tiny: 7.4,
} as const;

/** jsPDF's core fonts have no ₹ glyph, so amounts print as "Rs.". */
export const CURRENCY = "Rs.";
