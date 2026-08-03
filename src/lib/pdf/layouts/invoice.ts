import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { amountInWords, formatAmount, formatDate, formatNumber } from "@/lib/format";
import { box, line, sectionBar, text, textBlock, totalRow } from "@/lib/pdf/draw";
import { buildGstBreakdown, type GstBreakdown } from "@/lib/pdf/gst";
import { itemDetailLine } from "@/lib/pdf/items";
import {
  BODY_BOTTOM,
  COLORS,
  CONTENT_WIDTH,
  CURRENCY,
  FONT,
  PAGE,
} from "@/lib/pdf/theme";
import type { QuotationFull, Settings } from "@/lib/types/database";
import type { LoadedPdfAssets } from "@/lib/pdf/quotation-pdf";

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially Paid",
  paid: "Paid",
};

const DECLARATION =
  "We declare that this invoice shows the actual price of the goods and services described " +
  "and that all particulars are true and correct.";

/** Moves to a new page when `needed` millimetres will not fit below `y`. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= BODY_BOTTOM) return y;
  doc.addPage();
  return PAGE.margin;
}

/* ------------------------------------------------------------------ header */

function drawHeader(
  doc: jsPDF,
  quotation: QuotationFull,
  settings: Settings | null,
  company: string,
  logo: { dataUrl: string; format: string } | null,
  gst: GstBreakdown,
  y: number,
): number {
  const { margin } = PAGE;
  const metaWidth = 74;
  const infoWidth = CONTENT_WIDTH - metaWidth;
  const metaX = margin + infoWidth;

  let textX = margin + 4;
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, margin + 4, y + 5, 20, 20);
      textX = margin + 28;
    } catch {
      textX = margin + 4;
    }
  }

  let infoY = y + 10;
  text(doc, company, textX, infoY, { size: FONT.company, style: "bold", color: COLORS.ink });

  infoY += 5;
  const addressLines = [
    settings?.address,
    [settings?.city, settings?.state].filter(Boolean).join(", "),
    [settings?.phone ? `Ph: ${settings.phone}` : null, settings?.email ?? null]
      .filter(Boolean)
      .join("   "),
    settings?.website,
  ].filter((l): l is string => Boolean(l));

  infoY = textBlock(doc, addressLines.join("\n"), textX, infoY, {
    size: FONT.tiny,
    color: COLORS.muted,
    maxWidth: infoWidth - (textX - margin) - 4,
    lineHeight: 3.6,
  });

  if (settings?.gst_number) {
    infoY += 1.5;
    text(doc, `GSTIN: ${settings.gst_number}`, textX, infoY, {
      size: FONT.small,
      style: "bold",
      color: COLORS.ink,
    });
    infoY += 2;
  }

  /* Title strip and meta rows on the right. */
  const metaRows: [string, string][] = [
    ["Invoice No.", quotation.quote_number],
    ["Invoice Date", formatDate(quotation.date)],
    ["Place of Supply", gst.placeOfSupply],
    ["Payment Status", PAYMENT_LABEL[quotation.payment_status] ?? quotation.payment_status],
    ["Reverse Charge", "No"],
  ];

  const headerHeight = Math.max(42, infoY - y + 5, metaRows.length * 5 + 17);

  box(doc, margin, y, infoWidth, headerHeight);
  box(doc, metaX, y, metaWidth, headerHeight);
  box(doc, metaX, y, metaWidth, 9, { fill: COLORS.navy, stroke: COLORS.navy });

  text(doc, "TAX INVOICE", metaX + metaWidth / 2, y + 6.2, {
    size: 13,
    style: "bold",
    color: COLORS.white,
    align: "center",
  });

  let metaY = y + 15;
  metaRows.forEach(([label, value]) => {
    text(doc, label, metaX + 3.5, metaY, { size: FONT.tiny, color: COLORS.muted });
    text(doc, value, metaX + metaWidth - 3.5, metaY, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
      align: "right",
    });
    metaY += 5;
  });

  return y + headerHeight;
}

/* ------------------------------------------------------------------ billing */

function drawBillTo(
  doc: jsPDF,
  quotation: QuotationFull,
  gst: GstBreakdown,
  y: number,
): number {
  const { margin } = PAGE;
  const rightWidth = 74;
  const leftWidth = CONTENT_WIDTH - rightWidth;
  const rightX = margin + leftWidth;

  sectionBar(doc, "BILL TO", margin, y, leftWidth, { fill: COLORS.bandGrey, color: COLORS.ink });
  sectionBar(doc, "SUPPLY DETAILS", rightX, y, rightWidth, {
    fill: COLORS.bandGrey,
    color: COLORS.ink,
  });
  y += 6.5;

  const c = quotation.customer;
  const nameY = y + 5;
  text(doc, c?.business_name ?? "Walk-in Customer", margin + 4, nameY, {
    size: FONT.body,
    style: "bold",
    color: COLORS.ink,
  });

  const custLines = c
    ? [
        c.contact_person ? `Attn: ${c.contact_person}` : null,
        c.address,
        [c.city, c.state].filter(Boolean).join(", "),
        c.mobile ? `Mobile: ${c.mobile}` : null,
        c.email,
      ].filter((l): l is string => Boolean(l))
    : [];

  let leftY = textBlock(doc, custLines.join("\n"), margin + 4, nameY + 4.5, {
    size: FONT.small,
    color: COLORS.body,
    maxWidth: leftWidth - 8,
    lineHeight: 4,
  });

  if (c?.gst_number) {
    leftY += 1;
    text(doc, `GSTIN: ${c.gst_number}`, margin + 4, leftY, {
      size: FONT.small,
      style: "bold",
      color: COLORS.ink,
    });
    leftY += 2;
  }

  const supplyRows: [string, string][] = [
    ["Place of Supply", gst.placeOfSupply],
    ["Tax Type", gst.intraState ? "CGST + SGST (Intra-state)" : "IGST (Inter-state)"],
    ["Due Date", quotation.valid_until ? formatDate(quotation.valid_until) : "On receipt"],
  ];

  let rightY = y + 5;
  supplyRows.forEach(([label, value]) => {
    text(doc, label, rightX + 3.5, rightY, { size: FONT.tiny, color: COLORS.muted });
    rightY += 4;
    text(doc, value, rightX + 3.5, rightY, { size: FONT.tiny, style: "bold", color: COLORS.ink });
    rightY += 5;
  });

  const blockHeight = Math.max(30, leftY - y + 4, rightY - y);
  box(doc, margin, y, leftWidth, blockHeight);
  box(doc, rightX, y, rightWidth, blockHeight);

  return y + blockHeight;
}

/* -------------------------------------------------------------- item table */

function drawItems(doc: jsPDF, quotation: QuotationFull, hsn: string, y: number): number {
  const { margin } = PAGE;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: PAGE.margin, bottom: PAGE.margin + 4 },
    theme: "grid",
    head: [["#", "Description of Goods / Services", "HSN/SAC", "Size (W×H)", "Qty", "Rate", "Taxable Value"]],
    body: quotation.items.map((item, index) => {
      const detail = itemDetailLine(item);
      return [
        String(index + 1),
        detail ? `${item.description}\n${detail}` : item.description,
        hsn,
        item.width && item.height ? `${formatNumber(Number(item.width))} × ${formatNumber(Number(item.height))} ft` : "—",
        formatNumber(item.qty),
        formatAmount(item.rate),
        formatAmount(item.amount),
      ];
    }),
    styles: {
      font: "helvetica",
      fontSize: 8.2,
      cellPadding: { top: 2.4, right: 2.6, bottom: 2.4, left: 2.6 },
      textColor: COLORS.body,
      lineColor: COLORS.line,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 9 },
      1: { cellWidth: "auto", textColor: COLORS.ink },
      2: { halign: "center", cellWidth: 19 },
      3: { halign: "center", cellWidth: 24 },
      4: { halign: "right", cellWidth: 13 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 28, fontStyle: "bold", textColor: COLORS.ink },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY;
}

/* ------------------------------------------------------------ tax summary */

function drawTaxSummary(doc: jsPDF, gst: GstBreakdown, hsn: string, y: number): number {
  const { margin } = PAGE;

  const head = gst.intraState
    ? [["HSN/SAC", "Taxable Value", "CGST %", "CGST Amt", "SGST %", "SGST Amt", "Total Tax"]]
    : [["HSN/SAC", "Taxable Value", "IGST %", "IGST Amt", "Total Tax"]];

  const body = gst.slabs.map((slab) =>
    gst.intraState
      ? [
          hsn,
          formatAmount(slab.taxable),
          `${formatNumber(slab.rate / 2, 2)}%`,
          formatAmount(slab.cgst),
          `${formatNumber(slab.rate / 2, 2)}%`,
          formatAmount(slab.sgst),
          formatAmount(slab.tax),
        ]
      : [
          hsn,
          formatAmount(slab.taxable),
          `${formatNumber(slab.rate, 2)}%`,
          formatAmount(slab.igst),
          formatAmount(slab.tax),
        ],
  );

  const foot = gst.intraState
    ? [["Total", formatAmount(gst.taxable), "", formatAmount(gst.cgst), "", formatAmount(gst.sgst), formatAmount(gst.tax)]]
    : [["Total", formatAmount(gst.taxable), "", formatAmount(gst.igst), formatAmount(gst.tax)]];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: PAGE.margin, bottom: PAGE.margin + 4 },
    theme: "grid",
    head,
    body,
    foot,
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
      textColor: COLORS.body,
      lineColor: COLORS.line,
      lineWidth: 0.2,
      halign: "right",
    },
    headStyles: {
      fillColor: COLORS.bandGrey,
      textColor: COLORS.ink,
      fontStyle: "bold",
      fontSize: 7.6,
      halign: "right",
    },
    footStyles: {
      fillColor: COLORS.totalsFill,
      textColor: COLORS.ink,
      fontStyle: "bold",
      fontSize: 7.8,
      halign: "right",
    },
    columnStyles: { 0: { halign: "left" } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY;
}

/* ------------------------------------------------- payment terms & totals */

function drawTotalsBlock(
  doc: jsPDF,
  quotation: QuotationFull,
  settings: Settings | null,
  gst: GstBreakdown,
  upiQr: { dataUrl: string; format: string } | null,
  y: number,
): number {
  const { margin } = PAGE;
  const totalsWidth = 72;
  const leftWidth = CONTENT_WIDTH - totalsWidth;
  const totalsX = margin + leftWidth;

  const rows: [string, string, boolean][] = [
    ["Taxable Value", `${CURRENCY} ${formatAmount(gst.taxable)}`, false],
    ...(gst.intraState
      ? ([
          ["CGST", `${CURRENCY} ${formatAmount(gst.cgst)}`, false],
          ["SGST", `${CURRENCY} ${formatAmount(gst.sgst)}`, false],
        ] as [string, string, boolean][])
      : ([["IGST", `${CURRENCY} ${formatAmount(gst.igst)}`, false]] as [string, string, boolean][])),
    ["Grand Total", `${CURRENCY} ${formatAmount(quotation.grand_total)}`, true],
  ];

  const rowHeight = 7;
  const panelHeight = rows.length * rowHeight + 4;

  /* Left cell — bank, UPI QR and terms. */
  const qrSize = upiQr ? 24 : 0;
  const textWidth = leftWidth - 8 - (qrSize ? qrSize + 6 : 0);
  let leftY = y + 5.5;

  if (settings?.bank_details) {
    text(doc, "Bank Details", margin + 4, leftY, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
    });
    leftY += 4;
    leftY = textBlock(doc, settings.bank_details, margin + 4, leftY, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: textWidth,
      lineHeight: 3.6,
    });
    leftY += 2.5;
  }

  if (settings?.terms) {
    text(doc, "Terms & Conditions", margin + 4, leftY, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
    });
    leftY += 4;
    leftY = textBlock(doc, settings.terms, margin + 4, leftY, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: leftWidth - 8,
      lineHeight: 3.6,
    });
  }

  const blockHeight = Math.max(leftY - y + 5, panelHeight + 4, qrSize + 14);

  box(doc, margin, y, leftWidth, blockHeight);
  box(doc, totalsX, y, totalsWidth, blockHeight);

  if (upiQr) {
    try {
      doc.addImage(upiQr.dataUrl, upiQr.format, margin + leftWidth - qrSize - 5, y + 5, qrSize, qrSize);
      text(doc, "Scan to pay", margin + leftWidth - qrSize - 5, y + qrSize + 9, {
        size: FONT.tiny,
        color: COLORS.muted,
      });
    } catch {
      // A missing QR is not worth failing the document over.
    }
  }

  rows.forEach(([label, value, strong], i) => {
    const rowY = y + 2 + i * rowHeight;
    if (strong) {
      box(doc, totalsX, rowY, totalsWidth, rowHeight + 1.5, { fill: COLORS.totalsFill });
    }
    totalRow(doc, label, value, totalsX, rowY + 4.8, totalsWidth, {
      size: strong ? 9.8 : 8.6,
      style: strong ? "bold" : "normal",
      color: COLORS.ink,
    });
  });

  return y + blockHeight;
}

/* -------------------------------------------------------- signatory block */

function drawSignatory(
  doc: jsPDF,
  company: string,
  stamp: { dataUrl: string; format: string } | null,
  signature: { dataUrl: string; format: string } | null,
  y: number,
): number {
  const { margin } = PAGE;
  const signWidth = 72;
  const declWidth = CONTENT_WIDTH - signWidth;
  const signX = margin + declWidth;
  const height = 34;

  box(doc, margin, y, declWidth, height);
  box(doc, signX, y, signWidth, height);

  text(doc, "Declaration", margin + 4, y + 5.5, {
    size: FONT.tiny,
    style: "bold",
    color: COLORS.ink,
  });
  textBlock(doc, DECLARATION, margin + 4, y + 9.5, {
    size: FONT.tiny,
    color: COLORS.muted,
    maxWidth: declWidth - 8,
    lineHeight: 3.6,
  });

  text(doc, `For ${company}`, signX + signWidth - 4, y + 5.5, {
    size: FONT.tiny,
    style: "bold",
    color: COLORS.ink,
    align: "right",
  });

  // Stamp sits left, signature right, both inside the free space above the rule.
  if (stamp) {
    try {
      doc.addImage(stamp.dataUrl, stamp.format, signX + 5, y + 7, 21, 21);
    } catch {
      // Ignore an unreadable stamp — the rule below is still signable by hand.
    }
  }

  if (signature) {
    try {
      doc.addImage(signature.dataUrl, signature.format, signX + 31, y + 10, 36, 14);
    } catch {
      // As above.
    }
  }

  line(doc, signX + 28, y + 26, signX + signWidth - 4, y + 26, COLORS.muted);
  text(doc, "Authorised Signatory", signX + signWidth - 4, y + 30.5, {
    size: FONT.small,
    style: "bold",
    color: COLORS.ink,
    align: "right",
  });

  return y + height;
}

/* -------------------------------------------------------------------- main */

export function drawInvoice(
  doc: jsPDF,
  quotation: QuotationFull,
  settings: Settings | null,
  assets: LoadedPdfAssets | { dataUrl: string; format: string } | null,
): void {
  const logo = assets && "logo" in assets ? assets.logo : (assets as { dataUrl: string; format: string } | null);
  const stamp = assets && "stamp" in assets ? assets.stamp : null;
  const signature = assets && "signature" in assets ? assets.signature : null;
  const upiQr = assets && "upiQr" in assets ? assets.upiQr : null;

  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  const hsn = settings?.default_hsn?.trim() || "—";
  const gst = buildGstBreakdown(quotation.items, settings, quotation.customer);

  let y = PAGE.margin;

  y = drawHeader(doc, quotation, settings, company, logo, gst, y);
  y = drawBillTo(doc, quotation, gst, y);
  y = drawItems(doc, quotation, hsn, y + 3);

  y = ensureSpace(doc, y + 3, 26);
  y = drawTaxSummary(doc, gst, hsn, y);

  y = ensureSpace(doc, y + 3, 12);
  sectionBar(doc, `Amount in words: ${amountInWords(quotation.grand_total)}`, PAGE.margin, y, CONTENT_WIDTH, {
    fill: COLORS.bandGrey,
    color: COLORS.ink,
    size: FONT.tiny,
  });
  y += 6.5;

  y = ensureSpace(doc, y, 44);
  y = drawTotalsBlock(doc, quotation, settings, gst, upiQr, y);

  y = ensureSpace(doc, y, 34);
  drawSignatory(doc, company, stamp, signature, y);
}
