import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { amountInWords, formatAmount, formatDate, formatNumber } from "@/lib/format";
import { box, line, sectionBar, text, textBlock } from "@/lib/pdf/draw";
import { itemDetailLine } from "@/lib/pdf/items";
import {
  BODY_BOTTOM,
  COLORS,
  CONTENT_RIGHT,
  CONTENT_WIDTH,
  CURRENCY,
  FONT,
  PAGE,
} from "@/lib/pdf/theme";
import type { QuotationFull, Settings } from "@/lib/types/database";

const DISCLAIMER =
  "This quotation is not a contract or a bill. It is our best estimate of the total price for the " +
  "work and goods described above. The customer will be billed after indicating acceptance of this " +
  "quotation. Payment will be due prior to the delivery of the work and goods. Please sign and " +
  "return the quotation to the address listed above.";

/**
 * Quotation sheet: grey section bars, a boxed quote-meta grid, itemised costs
 * and a customer acceptance strip — the classic printed quote format.
 */
export function drawQuotation(
  doc: jsPDF,
  quotation: QuotationFull,
  settings: Settings | null,
  logo: { dataUrl: string; format: string } | null,
): void {
  const { margin } = PAGE;
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  let y = margin;

  /* --------------------------------------------------------------- header */
  let textX = margin;
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, margin, y, 17, 17);
      textX = margin + 21;
    } catch {
      textX = margin;
    }
  }

  text(doc, company, textX, y + 6, { size: FONT.company, style: "bold", color: COLORS.ink });
  text(doc, "QUOTATION", CONTENT_RIGHT, y + 7, {
    size: 22,
    style: "bold",
    color: COLORS.ink,
    align: "right",
  });

  const companyLines = [
    settings?.address,
    [settings?.city, settings?.state].filter(Boolean).join(" "),
    settings?.phone ? `Phone: ${settings.phone}` : "",
    settings?.email,
    settings?.gst_number ? `GSTIN: ${settings.gst_number}` : "",
  ].filter(Boolean) as string[];

  const headerEnd = textBlock(doc, companyLines.join("\n"), textX, y + 12, {
    size: FONT.small,
    color: COLORS.body,
    maxWidth: 85,
    lineHeight: 4.2,
  });

  /* ------------------------------------------------- quote meta grid (top right) */
  const metaWidth = 78;
  const metaX = CONTENT_RIGHT - metaWidth;
  const colW = metaWidth / 2;
  let metaY = y + 14;

  const metaPairs: [string, string, string, string][] = [
    ["QUOTE #", quotation.quote_number, "DATE", formatDate(quotation.date)],
    [
      "CUSTOMER",
      (quotation.customer?.business_name ?? "—").slice(0, 18),
      "VALID UNTIL",
      quotation.valid_until ? formatDate(quotation.valid_until) : "—",
    ],
  ];

  for (const [l1, v1, l2, v2] of metaPairs) {
    box(doc, metaX, metaY, colW, 5.5, { fill: COLORS.bandGrey });
    box(doc, metaX + colW, metaY, colW, 5.5, { fill: COLORS.bandGrey });
    text(doc, l1, metaX + colW / 2, metaY + 3.8, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
      align: "center",
    });
    text(doc, l2, metaX + colW * 1.5, metaY + 3.8, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
      align: "center",
    });
    metaY += 5.5;

    box(doc, metaX, metaY, colW, 6);
    box(doc, metaX + colW, metaY, colW, 6);
    text(doc, v1, metaX + colW / 2, metaY + 4.1, {
      size: FONT.small,
      color: COLORS.ink,
      align: "center",
    });
    text(doc, v2, metaX + colW * 1.5, metaY + 4.1, {
      size: FONT.small,
      color: COLORS.ink,
      align: "center",
    });
    metaY += 6;
  }

  y = Math.max(headerEnd, metaY) + 6;

  /* -------------------------------------------------------- customer info */
  y = sectionBar(doc, "CUSTOMER INFO", margin, y, CONTENT_WIDTH);
  const customer = quotation.customer;
  const customerLines = [
    customer?.contact_person,
    customer?.business_name,
    customer?.address,
    [customer?.city, customer?.state].filter(Boolean).join(" "),
    [customer?.mobile, customer?.email].filter(Boolean).join("  |  "),
    customer?.gst_number ? `GSTIN: ${customer.gst_number}` : "",
  ].filter(Boolean) as string[];

  const infoEnd = textBlock(doc, customerLines.join("\n"), margin + 3, y + 5, {
    size: FONT.small,
    color: COLORS.body,
    maxWidth: CONTENT_WIDTH - 6,
    lineHeight: 4.2,
  });
  const infoHeight = infoEnd - y + 3;
  box(doc, margin, y, CONTENT_WIDTH, infoHeight);
  y += infoHeight + 5;

  /* ---------------------------------------------------- description of work */
  if (quotation.notes) {
    y = sectionBar(doc, "DESCRIPTION OF WORK", margin, y, CONTENT_WIDTH);
    const notesEnd = textBlock(doc, quotation.notes, margin + 3, y + 5, {
      size: FONT.small,
      color: COLORS.body,
      maxWidth: CONTENT_WIDTH - 6,
      lineHeight: 4.2,
    });
    const notesHeight = Math.max(notesEnd - y + 3, 12);
    box(doc, margin, y, CONTENT_WIDTH, notesHeight);
    y += notesHeight + 5;
  }

  /* ------------------------------------------------------- itemised costs */
  const detailByRow = new Map<number, string>();

  autoTable(doc, {
    startY: y,
    head: [["ITEMISED COSTS", "QTY", `UNIT PRICE (${CURRENCY})`, `AMOUNT (${CURRENCY})`]],
    body: quotation.items.map((item) => [
      item.description,
      formatNumber(Number(item.qty)),
      formatAmount(Number(item.rate)),
      formatAmount(Number(item.amount)),
    ]),
    theme: "grid",
    margin: { left: margin, right: margin, bottom: 24 },
    styles: {
      font: "helvetica",
      fontSize: FONT.small,
      cellPadding: { top: 2.4, right: 2.5, bottom: 2.4, left: 2.5 },
      lineColor: COLORS.line,
      lineWidth: 0.25,
      textColor: COLORS.ink,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.bandGrey,
      textColor: COLORS.ink,
      fontStyle: "bold",
      fontSize: FONT.tiny,
    },
    columnStyles: {
      0: { cellWidth: 96 },
      1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 34, halign: "right" },
      3: { cellWidth: 38, halign: "right" },
    },
    didParseCell({ cell, column, section, row }) {
      if (section !== "body" || column.index !== 0) return;
      const item = quotation.items[row.index];
      const detail = item ? itemDetailLine(item) : "";
      if (!detail) return;
      detailByRow.set(row.index, detail);
      cell.styles.cellPadding = { top: 2.4, right: 2.5, bottom: 7, left: 2.5 };
    },
    didDrawCell({ cell, column, section, row }) {
      if (section !== "body" || column.index !== 0) return;
      const detail = detailByRow.get(row.index);
      if (!detail) return;
      text(doc, detail, cell.x + 2.5, cell.y + cell.height - 3, {
        size: FONT.tiny,
        color: COLORS.muted,
      });
    },
  });

  type WithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };
  y = (doc as WithAutoTable).lastAutoTable?.finalY ?? y;

  /* ---------------------------------------------------------------- totals */
  if (y > BODY_BOTTOM - 55) {
    doc.addPage();
    y = PAGE.margin;
  }

  const totalsWidth = 72;
  const totalsX = CONTENT_RIGHT - totalsWidth;
  const noteWidth = CONTENT_WIDTH - totalsWidth;

  const totalRows: [string, string, boolean][] = [
    ["SUBTOTAL", formatAmount(quotation.subtotal), false],
    ["GST", formatAmount(quotation.gst_amount), false],
    ["TOTAL QUOTE", `${CURRENCY} ${formatAmount(quotation.grand_total)}`, true],
  ];

  totalRows.forEach(([label, value, strong], i) => {
    const rowY = y + i * 7;
    box(doc, totalsX, rowY, totalsWidth * 0.52, 7, { fill: strong ? COLORS.bandGrey : undefined });
    box(doc, totalsX + totalsWidth * 0.52, rowY, totalsWidth * 0.48, 7, {
      fill: strong ? COLORS.bandGrey : undefined,
    });
    text(doc, label, totalsX + 3, rowY + 4.8, {
      size: FONT.small,
      style: strong ? "bold" : "normal",
      color: COLORS.ink,
    });
    text(doc, value, CONTENT_RIGHT - 3, rowY + 4.8, {
      size: FONT.small,
      style: strong ? "bold" : "normal",
      color: COLORS.ink,
      align: "right",
    });
  });

  const totalsHeight = totalRows.length * 7;
  box(doc, margin, y, noteWidth, totalsHeight);
  text(doc, "Thank you for your business!", margin + 4, y + totalsHeight / 2 + 1, {
    size: FONT.small,
    style: "italic",
    color: COLORS.body,
  });
  y += totalsHeight + 4;

  y = textBlock(doc, `Amount in words: ${amountInWords(Number(quotation.grand_total))}`, margin, y + 2, {
    size: FONT.tiny,
    style: "italic",
    color: COLORS.muted,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 3.8,
  });
  y += 4;

  /* ------------------------------------------------------ terms + bank block */
  for (const [heading, content] of [
    ["Bank Details", settings?.bank_details],
    ["Terms & Conditions", settings?.terms],
  ] as const) {
    if (!content) continue;
    if (y > BODY_BOTTOM - 30) {
      doc.addPage();
      y = PAGE.margin;
    }
    text(doc, heading, margin, y, { size: FONT.small, style: "bold", color: COLORS.ink });
    y = textBlock(doc, content, margin, y + 4, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: CONTENT_WIDTH,
      lineHeight: 3.6,
    });
    y += 3;
  }

  y = textBlock(doc, DISCLAIMER, margin, y + 1, {
    size: FONT.tiny,
    color: COLORS.muted,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 3.6,
  });
  y += 4;

  /* -------------------------------------------------- customer acceptance */
  const acceptHeight = 15;
  const acceptBlock = acceptHeight + 4.5; // heading + boxes

  if (y + acceptBlock > BODY_BOTTOM) {
    doc.addPage();
    y = PAGE.margin;
  }
  // Sit the signature strip on the bottom rule, the way a printed quote does,
  // rather than floating it directly under the terms.
  y = Math.max(y, BODY_BOTTOM - acceptBlock);

  text(doc, "Customer Acceptance", margin, y, {
    size: FONT.small,
    style: "bold",
    color: COLORS.ink,
  });
  y += 2.5;

  const cols = [CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.25];
  let colX = margin;
  ["Signature", "Printed Name", "Date"].forEach((label, i) => {
    box(doc, colX, y, cols[i], acceptHeight);
    text(doc, label, colX + 2.5, y + acceptHeight - 2.5, {
      size: FONT.tiny,
      color: COLORS.muted,
    });
    colX += cols[i];
  });

  line(doc, margin + 3, y + acceptHeight - 6, margin + cols[0] - 3, y + acceptHeight - 6, COLORS.hairline);
}
