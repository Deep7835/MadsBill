import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { amountInWords, formatAmount, formatDate, formatNumber } from "@/lib/format";
import { box, line, text, textBlock } from "@/lib/pdf/draw";
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

const DISCLAIMER =
  "This quotation is an estimate of the total price for the work described above. " +
  "The customer will be billed after indicating acceptance of this quotation. " +
  "Payment terms as agreed. Please sign and return this quotation to Madskraft.";

export function drawQuotation(
  doc: jsPDF,
  quotation: QuotationFull,
  settings: Settings | null,
  assets: LoadedPdfAssets | { dataUrl: string; format: string } | null,
): void {
  const logo = assets && "logo" in assets ? assets.logo : (assets as { dataUrl: string; format: string } | null);
  const stamp = assets && "stamp" in assets ? assets.stamp : null;
  const signature = assets && "signature" in assets ? assets.signature : null;

  const { margin } = PAGE;
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  let y = margin;

  /* --------------------------------------------------------------- header */
  let textX = margin;
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, margin, y, 20, 20);
      textX = margin + 24;
    } catch {
      textX = margin;
    }
  }

  text(doc, company, textX, y + 6, {
    size: FONT.company,
    style: "bold",
    color: COLORS.ink,
  });

  const addressLines = [
    settings?.address,
    [settings?.city, settings?.state].filter(Boolean).join(", "),
    settings?.phone ? `Ph: ${settings.phone}` : null,
    settings?.email ? `Email: ${settings.email}` : null,
    settings?.gst_number ? `GSTIN: ${settings.gst_number}` : null,
  ].filter((l): l is string => Boolean(l));

  textBlock(doc, addressLines.join("\n"), textX, y + 11, {
    size: FONT.tiny,
    color: COLORS.muted,
    lineHeight: 3.6,
  });

  text(doc, "QUOTATION", CONTENT_RIGHT, y + 8, {
    size: FONT.title,
    style: "bold",
    color: COLORS.navy,
    align: "right",
  });

  y += 28;

  /* --------------------------------------------------------- meta-bar grid */
  const half = CONTENT_WIDTH / 2;
  const leftX = margin;
  const rightX = margin + half;

  box(doc, leftX, y, half, 6.5, { fill: COLORS.navy, stroke: COLORS.navy });
  text(doc, "PREPARED FOR", leftX + 3, y + 4.5, {
    size: FONT.tiny,
    style: "bold",
    color: COLORS.white,
  });

  box(doc, rightX, y, half, 6.5, { fill: COLORS.navy, stroke: COLORS.navy });
  text(doc, "QUOTATION DETAILS", rightX + 3, y + 4.5, {
    size: FONT.tiny,
    style: "bold",
    color: COLORS.white,
  });

  y += 6.5;

  const c = quotation.customer;
  const custLines = c
    ? [
        c.business_name,
        c.contact_person ? `Attn: ${c.contact_person}` : null,
        c.address,
        [c.city, c.state].filter(Boolean).join(", "),
        c.mobile ? `Ph: ${c.mobile}` : null,
        c.gst_number ? `GSTIN: ${c.gst_number}` : null,
      ].filter((l): l is string => Boolean(l))
    : ["Walk-in Customer"];

  const custBottomY = textBlock(doc, custLines.join("\n"), leftX + 3, y + 4, {
    size: FONT.small,
    color: COLORS.ink,
    lineHeight: 4.2,
  });

  const metaRows: [string, string][] = [
    ["Quote Number:", quotation.quote_number],
    ["Date:", formatDate(quotation.date)],
    ["Valid Until:", quotation.valid_until ? formatDate(quotation.valid_until) : "15 Days"],
  ];

  let metaY = y + 4;
  metaRows.forEach(([label, value]) => {
    text(doc, label, rightX + 3, metaY, {
      size: FONT.tiny,
      color: COLORS.muted,
    });
    text(doc, value, CONTENT_RIGHT - 3, metaY, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
      align: "right",
    });
    metaY += 4.5;
  });

  const blockHeight = Math.max(26, custBottomY - y + 4, metaY - y + 2);
  box(doc, leftX, y, half, blockHeight);
  box(doc, rightX, y, half, blockHeight);
  y += blockHeight + 4;

  /* ---------------------------------------------------------- items table */
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    head: [["Description", "Dimensions", "Qty", "Rate", "Amount"]],
    body: quotation.items.map((item) => [
      itemDetailLine(item),
      item.width && item.height ? `${item.width} × ${item.height} ft` : "—",
      formatNumber(item.qty),
      `${CURRENCY} ${formatNumber(item.rate)}`,
      `${CURRENCY} ${formatAmount(item.amount)}`,
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      textColor: COLORS.body,
      lineColor: COLORS.line,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.bandGrey,
      textColor: COLORS.ink,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 26 },
      2: { halign: "right", cellWidth: 16 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 28 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 2;

  /* --------------------------------------------------------- totals block */
  const totalsWidth = 70;
  const totalsX = CONTENT_RIGHT - totalsWidth;

  const totalsRows: [string, string, boolean][] = [
    ["Subtotal:", `${CURRENCY} ${formatAmount(quotation.subtotal)}`, false],
    [`GST (${formatNumber(quotation.items[0]?.gst_percent ?? 18)}%):`, `${CURRENCY} ${formatAmount(quotation.gst_amount)}`, false],
    ["Total:", `${CURRENCY} ${formatAmount(quotation.grand_total)}`, true],
  ];

  totalsRows.forEach(([label, value, strong]) => {
    text(doc, label, totalsX, y + 4, {
      size: strong ? 10 : 9,
      style: strong ? "bold" : "normal",
      color: COLORS.ink,
    });
    text(doc, value, CONTENT_RIGHT, y + 4, {
      size: strong ? 10 : 9,
      style: strong ? "bold" : "normal",
      color: COLORS.ink,
      align: "right",
    });
    y += 5.5;
  });

  y += 2;
  const wordsText = `Amount in words: ${amountInWords(quotation.grand_total)}`;
  text(doc, wordsText, margin, y, {
    size: FONT.tiny,
    style: "italic",
    color: COLORS.muted,
  });
  y += 6;

  /* ----------------------------------------------- terms and disclaimers */
  if (settings?.terms) {
    text(doc, "Terms & Conditions", margin, y, {
      size: FONT.tiny,
      style: "bold",
      color: COLORS.ink,
    });
    y += 3.5;
    y = textBlock(doc, settings.terms, margin, y, {
      size: FONT.tiny,
      color: COLORS.muted,
      maxWidth: CONTENT_WIDTH,
      lineHeight: 3.6,
    });
    y += 4;
  }

  y = textBlock(doc, DISCLAIMER, margin, y, {
    size: FONT.tiny,
    style: "italic",
    color: COLORS.muted,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 3.6,
  });
  y += 4;

  /* -------------------------------------------------- customer acceptance */
  const acceptHeight = 16;
  const acceptBlock = acceptHeight + 4.5;

  if (y + acceptBlock > BODY_BOTTOM) {
    doc.addPage();
    y = PAGE.margin;
  }
  y = Math.max(y, BODY_BOTTOM - acceptBlock);

  text(doc, "Customer Acceptance & Sign Off", margin, y, {
    size: FONT.small,
    style: "bold",
    color: COLORS.ink,
  });

  if (stamp) {
    try {
      doc.addImage(stamp.dataUrl, stamp.format, CONTENT_RIGHT - 65, y - 10, 18, 18);
    } catch {
      // Stamp fallback
    }
  }

  if (signature) {
    try {
      doc.addImage(signature.dataUrl, signature.format, CONTENT_RIGHT - 40, y - 10, 32, 12);
    } catch {
      // Signature fallback
    }
  }

  y += 2.5;

  const cols = [CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.25];
  let colX = margin;
  ["Customer Signature", "Printed Name", "Date"].forEach((label, i) => {
    box(doc, colX, y, cols[i], acceptHeight);
    text(doc, label, colX + 2.5, y + acceptHeight - 2.5, {
      size: FONT.tiny,
      color: COLORS.muted,
    });
    colX += cols[i];
  });

  line(doc, margin + 3, y + acceptHeight - 6, margin + cols[0] - 3, y + acceptHeight - 6, COLORS.hairline);
}
