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
import type { LoadedPdfAssets } from "@/lib/pdf/quotation-pdf";

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially Paid",
  paid: "Paid",
};

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
    [settings?.city, settings?.state].filter(Boolean).join(", "),
    settings?.phone ? `Ph: ${settings.phone}` : null,
    settings?.email ? `Email: ${settings.email}` : null,
    settings?.gst_number ? `GSTIN: ${settings.gst_number}` : null,
  ].filter((l): l is string => Boolean(l));

  headerY = textBlock(doc, addressLines.join("\n"), textX, headerY, {
    size: FONT.tiny,
    color: COLORS.muted,
    lineHeight: 3.6,
  });

  const leftHeaderHeight = Math.max(34, headerY - y + 4);
  box(doc, margin, headerTop, half, leftHeaderHeight);

  /* -------------------------------------------------------- doc meta cell */
  box(doc, margin + half, headerTop, half, leftHeaderHeight);

  text(doc, "TAX INVOICE", CONTENT_RIGHT - 4, y + 10, {
    size: FONT.title,
    style: "bold",
    color: COLORS.navy,
    align: "right",
  });

  const metaRows: [string, string][] = [
    ["Invoice No.", quotation.quote_number],
    ["Invoice Date", formatDate(quotation.date)],
    ["Payment Status", PAYMENT_LABEL[quotation.payment_status] ?? quotation.payment_status],
  ];

  let metaY = y + 17;
  metaRows.forEach(([label, value]) => {
    text(doc, label, margin + half + 4, metaY, {
      size: FONT.tiny,
      color: COLORS.muted,
    });
    text(doc, value, CONTENT_RIGHT - 4, metaY, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
      align: "right",
    });
    metaY += 4.5;
  });

  y += leftHeaderHeight;

  /* ------------------------------------------------------------- customer */
  const custBarY = y;
  sectionBar(doc, "BILL TO (CUSTOMER DETAILS)", margin, custBarY, CONTENT_WIDTH, {
    fill: COLORS.bandGrey,
    color: COLORS.ink,
  });
  y += 6.5;

  const c = quotation.customer;
  const custLines = c
    ? [
        c.business_name,
        c.contact_person ? `Attn: ${c.contact_person}` : null,
        c.address,
        [c.city, c.state].filter(Boolean).join(", "),
        c.gst_number ? `GSTIN: ${c.gst_number}` : null,
        c.mobile ? `Mobile: ${c.mobile}` : null,
      ].filter((l): l is string => Boolean(l))
    : ["Walk-in Customer"];

  const custTopY = y + 4;
  const custBottomY = textBlock(doc, custLines.join("\n"), margin + 4, custTopY, {
    size: FONT.small,
    color: COLORS.ink,
    lineHeight: 4.2,
  });

  const custBlockHeight = Math.max(24, custBottomY - y + 4);
  box(doc, margin, y, CONTENT_WIDTH, custBlockHeight);
  y += custBlockHeight;

  /* ---------------------------------------------------------- items table */
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [["S.N.", "Description of Goods / Services", "Size (W×H)", "Qty", "Rate", "Amount"]],
    body: quotation.items.map((item, index) => [
      String(index + 1),
      itemDetailLine(item),
      item.width && item.height ? `${item.width} × ${item.height} ft` : "—",
      formatNumber(item.qty),
      `${CURRENCY} ${formatNumber(item.rate)}`,
      `${CURRENCY} ${formatAmount(item.amount)}`,
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: COLORS.body,
      lineColor: COLORS.line,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "right", cellWidth: 16 },
      4: { halign: "right", cellWidth: 26 },
      5: { halign: "right", cellWidth: 28 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY;

  /* ---------------------------------------------------- amount in words bar */
  const wordsText = `Amount in words: ${amountInWords(quotation.grand_total)}`;
  sectionBar(doc, wordsText, margin, y, CONTENT_WIDTH, {
    fill: COLORS.bandGrey,
    color: COLORS.ink,
    size: FONT.tiny,
  });
  y += 6.5;

  /* ------------------------------------------------ totals / bank & terms */
  const totalsWidth = 65;
  const leftWidth = CONTENT_WIDTH - totalsWidth;
  const totalsX = margin + leftWidth;

  const panelRows: [string, string, boolean][] = [
    ["Subtotal", `${CURRENCY} ${formatAmount(quotation.subtotal)}`, false],
    [`GST (${formatNumber(quotation.items[0]?.gst_percent ?? 18)}%)`, `${CURRENCY} ${formatAmount(quotation.gst_amount)}`, false],
    ["Grand Total", `${CURRENCY} ${formatAmount(quotation.grand_total)}`, true],
  ];

  const panelHeight = panelRows.length * 7 + 4;
  let leftY = y + 4;

  if (settings?.bank_details) {
    text(doc, "Bank Details for Payment", margin + 4, leftY, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
    });
    leftY += 4;
    leftY = textBlock(doc, settings.bank_details, margin + 4, leftY, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: leftWidth - 32,
      lineHeight: 3.6,
    });
  }

  if (upiQr) {
    try {
      doc.addImage(upiQr.dataUrl, "PNG", margin + leftWidth - 26, y + 4, 22, 22);
      text(doc, "Scan UPI QR", margin + leftWidth - 26, y + 27, { size: FONT.tiny, color: COLORS.muted });
    } catch {
      // Ignore graphic error
    }
  }

  if (settings?.terms) {
    leftY += 3;
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

  /* ------------------------------------------------------------ stamp & signature */
  const signHeight = 26;
  if (y + signHeight < BODY_BOTTOM) {
    box(doc, margin, y, CONTENT_WIDTH, signHeight);

    // Render stamp image if uploaded
    if (stamp) {
      try {
        doc.addImage(stamp.dataUrl, stamp.format, margin + 8, y + 3, 20, 20);
      } catch {
        // stamp fallback
      }
    }

    // Render signature image if uploaded
    if (signature) {
      try {
        doc.addImage(signature.dataUrl, signature.format, CONTENT_RIGHT - 54, y + 2, 36, 14);
      } catch {
        // signature fallback
      }
    }

    line(doc, CONTENT_RIGHT - 58, y + 17, CONTENT_RIGHT - 6, y + 17, COLORS.muted);
    text(doc, `For ${company}`, CONTENT_RIGHT - 6, y + 5, {
      size: FONT.tiny,
      color: COLORS.muted,
      align: "right",
    });
    text(doc, "Authorised Signatory", CONTENT_RIGHT - 6, y + 21, {
      size: FONT.small,
      style: "bold",
      color: COLORS.ink,
      align: "right",
    });
  }
}
