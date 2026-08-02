import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { amountInWords, formatAmount, formatDate, formatNumber } from "@/lib/format";
import { box, line, sectionBar, text, textBlock, totalRow } from "@/lib/pdf/draw";
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

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially Paid",
  paid: "Paid",
};

/**
 * Bordered, grid-ruled invoice: company block over a meta table, Bill To /
 * Ship To split, navy items table, and a tinted totals panel beside the terms.
 */
export function drawInvoice(
  doc: jsPDF,
  quotation: QuotationFull,
  settings: Settings | null,
  logo: { dataUrl: string; format: string } | null,
): void {
  const { margin } = PAGE;
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  const half = CONTENT_WIDTH / 2;
  let y = margin;

  /* ---------------------------------------------------------- header cell */
  const headerTop = y;
  let textX = margin + 4;
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, margin + 4, y + 4, 18, 18);
      textX = margin + 26;
    } catch {
      textX = margin + 4;
    }
  }

  let headerY = y + 10;
  text(doc, company, textX, headerY, {
    size: FONT.company,
    style: "bold",
    color: COLORS.ink,
  });

  headerY += 5;
  const addressLines = [
    settings?.address,
    [settings?.city, settings?.state].filter(Boolean).join(" "),
    [settings?.phone, settings?.email].filter(Boolean).join("  |  "),
    settings?.gst_number ? `GSTIN: ${settings.gst_number}` : "",
  ].filter(Boolean) as string[];

  headerY = textBlock(doc, addressLines.join("\n"), textX, headerY, {
    size: FONT.small,
    color: COLORS.muted,
    maxWidth: half - 10,
    lineHeight: 4.1,
  });

  text(doc, "INVOICE", CONTENT_RIGHT - 4, y + 18, {
    size: FONT.title,
    style: "normal",
    color: COLORS.navy,
    align: "right",
  });

  const headerHeight = Math.max(headerY - headerTop + 4, 34);
  box(doc, margin, headerTop, CONTENT_WIDTH, headerHeight);
  y = headerTop + headerHeight;

  /* ------------------------------------------------------------ meta cell */
  const metaRows: [string, string][] = [
    ["Invoice#", quotation.quote_number],
    ["Invoice Date", formatDate(quotation.date)],
    ["Payment", PAYMENT_LABEL[quotation.payment_status] ?? quotation.payment_status],
  ];
  if (quotation.valid_until) metaRows.push(["Due Date", formatDate(quotation.valid_until)]);

  const metaHeight = metaRows.length * 6 + 6;
  box(doc, margin, y, half, metaHeight);
  box(doc, margin + half, y, half, metaHeight);

  metaRows.forEach(([label, value], i) => {
    const rowY = y + 8 + i * 6;
    text(doc, label, margin + 4, rowY, { size: FONT.small, color: COLORS.muted });
    text(doc, value, margin + 36, rowY, { size: FONT.small, style: "bold", color: COLORS.ink });
  });
  y += metaHeight;

  /* ------------------------------------------------------ bill to / ship to */
  sectionBar(doc, "Bill To", margin, y, half);
  sectionBar(doc, "Ship To", margin + half, y, half);
  y += 6.5;

  const customer = quotation.customer;
  const addressBlock = [
    customer?.address,
    [customer?.city, customer?.state].filter(Boolean).join(" "),
    customer?.mobile ? `Mobile: ${customer.mobile}` : "",
    customer?.gst_number ? `GSTIN: ${customer.gst_number}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let billY = y + 6;
  text(doc, customer?.business_name ?? "—", margin + 4, billY, {
    size: 10.5,
    style: "bold",
    color: COLORS.ink,
  });
  billY += 5;
  if (customer?.contact_person) {
    text(doc, `Attn: ${customer.contact_person}`, margin + 4, billY, {
      size: FONT.small,
      color: COLORS.body,
    });
    billY += 4.2;
  }
  const billEnd = textBlock(doc, addressBlock, margin + 4, billY, {
    size: FONT.small,
    color: COLORS.body,
    maxWidth: half - 8,
    lineHeight: 4.2,
  });

  const shipEnd = textBlock(doc, addressBlock || "—", margin + half + 4, y + 6, {
    size: FONT.small,
    color: COLORS.body,
    maxWidth: half - 8,
    lineHeight: 4.2,
  });

  const partyHeight = Math.max(billEnd, shipEnd) - y + 4;
  box(doc, margin, y, half, partyHeight);
  box(doc, margin + half, y, half, partyHeight);
  y += partyHeight;

  /* ---------------------------------------------------------- items table */
  // The description cell holds only the item name; the size/area sub-line is
  // drawn underneath it in grey, with extra bottom padding reserved for it so
  // it can never collide with a description that wraps.
  const detailByRow = new Map<number, string>();

  autoTable(doc, {
    startY: y,
    head: [["#", "Item & Description", "Qty", `Rate (${CURRENCY})`, `Amount (${CURRENCY})`]],
    body: quotation.items.map((item, i) => [
      String(i + 1),
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
      cellPadding: { top: 2.6, right: 2.5, bottom: 2.6, left: 2.5 },
      lineColor: COLORS.line,
      lineWidth: 0.25,
      textColor: COLORS.ink,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: FONT.small,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: "center", textColor: COLORS.muted },
      1: { cellWidth: 92 },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 27, halign: "right" },
      4: { cellWidth: 40, halign: "right" },
    },
    didParseCell({ cell, column, section, row }) {
      if (section !== "body" || column.index !== 1) return;
      const item = quotation.items[row.index];
      const detail = item ? itemDetailLine(item) : "";
      if (!detail) return;
      detailByRow.set(row.index, detail);
      cell.styles.cellPadding = { top: 2.6, right: 2.5, bottom: 7, left: 2.5 };
    },
    didDrawCell({ cell, column, section, row }) {
      if (section !== "body" || column.index !== 1) return;
      const detail = detailByRow.get(row.index);
      if (!detail) return;
      text(doc, detail, cell.x + 2.5, cell.y + cell.height - 3, {
        size: FONT.tiny,
        color: COLORS.muted,
      });
    },
  });

  type WithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };
  y = ((doc as WithAutoTable).lastAutoTable?.finalY ?? y) + 0;

  /* -------------------------------------------------------- sub total row */
  const totalsWidth = 67;
  const totalsX = CONTENT_RIGHT - totalsWidth;

  if (y > BODY_BOTTOM - 60) {
    doc.addPage();
    y = PAGE.margin;
  }

  box(doc, margin, y, CONTENT_WIDTH - totalsWidth, 8);
  box(doc, totalsX, y, totalsWidth, 8);
  text(doc, "Sub Total", totalsX - 3, y + 5.4, {
    size: FONT.body,
    style: "bold",
    color: COLORS.ink,
    align: "right",
  });
  text(doc, formatAmount(quotation.subtotal), CONTENT_RIGHT - 3, y + 5.4, {
    size: FONT.body,
    color: COLORS.ink,
    align: "right",
  });
  y += 8;

  /* ------------------------------------------- terms block + totals panel */
  // We track payment as a status, not a part-paid amount, so a "partial"
  // invoice still shows the full figure as outstanding.
  const balanceDue = quotation.payment_status === "paid" ? 0 : Number(quotation.grand_total);

  const panelRows: [string, string, boolean][] = [
    ["GST", `${CURRENCY} ${formatAmount(quotation.gst_amount)}`, false],
    ["Total", `${CURRENCY} ${formatAmount(quotation.grand_total)}`, true],
    ["Balance Due", `${CURRENCY} ${formatAmount(balanceDue)}`, true],
  ];
  const panelHeight = panelRows.length * 7 + 5;

  const leftWidth = CONTENT_WIDTH - totalsWidth;
  let leftY = y + 6;
  leftY = textBlock(doc, `Amount in words: ${amountInWords(Number(quotation.grand_total))}`, margin + 4, leftY, {
    size: FONT.tiny,
    style: "italic",
    color: COLORS.muted,
    maxWidth: leftWidth - 8,
    lineHeight: 3.8,
  });

  if (quotation.notes) {
    leftY += 4;
    text(doc, "Notes", margin + 4, leftY, { size: FONT.small, style: "bold", color: COLORS.ink });
    leftY += 4;
    leftY = textBlock(doc, quotation.notes, margin + 4, leftY, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: leftWidth - 8,
      lineHeight: 3.8,
    });
  }

  if (settings?.bank_details) {
    leftY += 4;
    text(doc, "Bank Details", margin + 4, leftY, { size: FONT.small, style: "bold", color: COLORS.ink });
    leftY += 4;
    leftY = textBlock(doc, settings.bank_details, margin + 4, leftY, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: leftWidth - 8,
      lineHeight: 3.8,
    });
  }

  if (settings?.terms) {
    leftY += 4;
    text(doc, "Terms & Conditions", margin + 4, leftY, {
      size: FONT.small,
      style: "bold",
      color: COLORS.ink,
    });
    leftY += 4;
    leftY = textBlock(doc, settings.terms, margin + 4, leftY, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: leftWidth - 8,
      lineHeight: 3.8,
    });
  }

  const blockHeight = Math.max(leftY - y + 5, panelHeight + 4);
  box(doc, margin, y, leftWidth, blockHeight);
  box(doc, totalsX, y, totalsWidth, blockHeight);

  // Tinted totals panel sits at the top of the right cell.
  box(doc, totalsX, y, totalsWidth, panelHeight, { fill: COLORS.totalsFill });
  panelRows.forEach(([label, value, strong], i) => {
    totalRow(doc, label, value, totalsX, y + 6.5 + i * 7, totalsWidth, {
      size: strong ? 9.6 : 9,
      style: strong ? "bold" : "normal",
      color: COLORS.ink,
    });
  });

  y += blockHeight;

  /* ------------------------------------------------------------ signature */
  const signHeight = 22;
  if (y + signHeight < BODY_BOTTOM) {
    box(doc, margin, y, CONTENT_WIDTH, signHeight);
    line(doc, CONTENT_RIGHT - 58, y + 14, CONTENT_RIGHT - 6, y + 14, COLORS.muted);
    text(doc, `For ${company}`, CONTENT_RIGHT - 6, y + 6, {
      size: FONT.tiny,
      color: COLORS.muted,
      align: "right",
    });
    text(doc, "Authorised Signatory", CONTENT_RIGHT - 6, y + 18, {
      size: FONT.small,
      style: "bold",
      color: COLORS.ink,
      align: "right",
    });
  }
}
