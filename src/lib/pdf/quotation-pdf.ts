import type { jsPDF } from "jspdf";

import { amountInWords, formatAmount, formatDate, formatNumber } from "@/lib/format";
import type { QuotationFull, Settings } from "@/lib/types/database";

const PRIMARY: [number, number, number] = [37, 99, 235]; // blue-600
const MUTED: [number, number, number] = [110, 118, 132];
const DARK: [number, number, number] = [24, 27, 35];
const LIGHT: [number, number, number] = [244, 246, 250];

const MARGIN = 14;
const PAGE_WIDTH = 210; // A4 portrait, mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/** jsPDF's core fonts have no ₹ glyph — amounts are printed with "Rs." instead. */
const RUPEE = "Rs.";

function line(doc: jsPDF, y: number) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
}

function multiline(
  doc: jsPDF,
  text: string | null | undefined,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4.2,
): number {
  if (!text) return y;
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  lines.forEach((l, i) => doc.text(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

async function loadLogo(url: string): Promise<{ dataUrl: string; format: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format = blob.type.includes("png") ? "PNG" : blob.type.includes("webp") ? "WEBP" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("logo read failed"));
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    // A missing or CORS-blocked logo must never block the document.
    return null;
  }
}

export interface BuildPdfOptions {
  quotation: QuotationFull;
  settings: Settings | null;
}

/** Builds the A4 quotation/invoice document. Title flips with `status`. */
export async function buildQuotationPdf({
  quotation,
  settings,
}: BuildPdfOptions): Promise<jsPDF> {
  // jsPDF is ~150 kB — loaded only when someone actually asks for a document.
  const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const isInvoice = quotation.status === "invoice";
  const docTitle = isInvoice ? "INVOICE" : "QUOTATION";
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";

  /* ------------------------------------------------------------- header */
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");

  let headerTextX = MARGIN;
  if (settings?.logo_url) {
    const logo = await loadLogo(settings.logo_url);
    if (logo) {
      try {
        doc.addImage(logo.dataUrl, logo.format, MARGIN, 10, 22, 22);
        headerTextX = MARGIN + 26;
      } catch {
        headerTextX = MARGIN;
      }
    }
  }

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company, headerTextX, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const companyAddress = [settings?.address, [settings?.city, settings?.state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join("\n");
  let y = multiline(doc, companyAddress, headerTextX, 22, 95, 4);
  const contactLine = [settings?.phone, settings?.email, settings?.website]
    .filter(Boolean)
    .join("  •  ");
  if (contactLine) {
    doc.text(contactLine, headerTextX, y);
    y += 4;
  }
  if (settings?.gst_number) {
    doc.text(`GSTIN: ${settings.gst_number}`, headerTextX, y);
    y += 4;
  }

  // Document title block (right)
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(docTitle, PAGE_WIDTH - MARGIN, 18, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const metaRows: [string, string][] = [
    [isInvoice ? "Invoice No." : "Quote No.", quotation.quote_number],
    ["Date", formatDate(quotation.date)],
  ];
  if (!isInvoice && quotation.valid_until) {
    metaRows.push(["Valid Until", formatDate(quotation.valid_until)]);
  }
  if (isInvoice) {
    metaRows.push(["Payment", quotation.payment_status.toUpperCase()]);
  }
  metaRows.forEach(([label, value], i) => {
    const rowY = 25 + i * 5;
    doc.setTextColor(...MUTED);
    doc.text(label, PAGE_WIDTH - MARGIN - 32, rowY, { align: "right" });
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.text(value, PAGE_WIDTH - MARGIN, rowY, { align: "right" });
    doc.setFont("helvetica", "normal");
  });

  const headerBottom = Math.max(y, 25 + metaRows.length * 5) + 3;
  line(doc, headerBottom);

  /* --------------------------------------------------------- bill to box */
  const customer = quotation.customer;
  let billY = headerBottom + 7;

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.text(isInvoice ? "BILL TO" : "QUOTATION FOR", MARGIN, billY);

  billY += 5;
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(customer?.business_name ?? "—", MARGIN, billY);

  billY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);

  const customerLines = [
    customer?.contact_person ? `Attn: ${customer.contact_person}` : "",
    customer?.address ?? "",
    [customer?.city, customer?.state].filter(Boolean).join(", "),
    customer?.mobile ? `Mobile: ${customer.mobile}` : "",
    customer?.email ?? "",
    customer?.gst_number ? `GSTIN: ${customer.gst_number}` : "",
  ].filter(Boolean);

  customerLines.forEach((text, i) => {
    doc.text(text, MARGIN, billY + i * 4.2);
  });
  const billBottom = billY + customerLines.length * 4.2 + 3;

  /* ------------------------------------------------------------- items */
  const body = quotation.items.map((item, index) => {
    const isSqft = item.rate_type === "sqft";
    const size = isSqft
      ? `${formatNumber(Number(item.width ?? 0))} x ${formatNumber(Number(item.height ?? 0))} ft`
      : "—";
    const area = isSqft ? formatNumber(Number(item.area ?? 0)) : "—";
    return [
      String(index + 1),
      item.description,
      size,
      area,
      formatNumber(Number(item.qty), 2),
      formatAmount(Number(item.rate)),
      `${formatNumber(Number(item.gst_percent), 0)}%`,
      formatAmount(Number(item.amount)),
    ];
  });

  autoTable(doc, {
    startY: billBottom,
    head: [["#", "Description", "Size (W x H)", "Area", "Qty", `Rate (${RUPEE})`, "GST", `Amount (${RUPEE})`]],
    body,
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: DARK,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 13, halign: "center" },
      7: { cellWidth: 30, halign: "right" },
    },
  });

  type WithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };
  let cursor = ((doc as WithAutoTable).lastAutoTable?.finalY ?? billBottom) + 6;

  /* ------------------------------------------------------------ totals */
  const totalsX = PAGE_WIDTH - MARGIN - 70;
  const totalRows: [string, string, boolean][] = [
    ["Subtotal", `${RUPEE} ${formatAmount(quotation.subtotal)}`, false],
    ["GST", `${RUPEE} ${formatAmount(quotation.gst_amount)}`, false],
    ["Grand Total", `${RUPEE} ${formatAmount(quotation.grand_total)}`, true],
  ];

  if (cursor > 235) {
    doc.addPage();
    cursor = 20;
  }

  totalRows.forEach(([label, value, strong]) => {
    if (strong) {
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(totalsX, cursor - 4.5, 70, 8, 1.2, 1.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
    } else {
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.text(label, totalsX + 3, cursor);
    doc.text(value, PAGE_WIDTH - MARGIN - 3, cursor, { align: "right" });
    cursor += strong ? 9 : 5.5;
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  cursor = multiline(
    doc,
    `Amount in words: ${amountInWords(Number(quotation.grand_total))}`,
    MARGIN,
    cursor + 1,
    CONTENT_WIDTH,
  );
  cursor += 6;

  /* ------------------------------------------------- notes / bank / terms */
  const blocks: [string, string | null | undefined][] = [
    ["Notes", quotation.notes],
    ["Bank Details", settings?.bank_details],
    ["Terms & Conditions", settings?.terms],
  ];

  for (const [heading, content] of blocks) {
    if (!content) continue;
    if (cursor > 245) {
      doc.addPage();
      cursor = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(heading, MARGIN, cursor);
    cursor += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    cursor = multiline(doc, content, MARGIN, cursor, CONTENT_WIDTH) + 5;
  }

  /* ---------------------------------------------------------- signature */
  if (cursor > 245) {
    doc.addPage();
    cursor = 30;
  }
  const signY = Math.max(cursor + 8, 255);
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(PAGE_WIDTH - MARGIN - 55, signY, PAGE_WIDTH - MARGIN, signY);
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text("Authorised Signatory", PAGE_WIDTH - MARGIN, signY + 4.5, { align: "right" });
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(`For ${company}`, PAGE_WIDTH - MARGIN, signY + 9, { align: "right" });

  /* -------------------------------------------------------------- footer */
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `${company} · ${docTitle} ${quotation.quote_number}`,
      MARGIN,
      290,
    );
    doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH - MARGIN, 290, { align: "right" });
  }

  return doc;
}

export function pdfFileName(quotation: QuotationFull): string {
  const prefix = quotation.status === "invoice" ? "Invoice" : "Quotation";
  const customer = (quotation.customer?.business_name ?? "Customer").replace(/[^\w\s-]/g, "").trim();
  return `${prefix}-${quotation.quote_number}-${customer}.pdf`.replace(/\s+/g, "-");
}

export async function downloadQuotationPdf(options: BuildPdfOptions): Promise<void> {
  const doc = await buildQuotationPdf(options);
  doc.save(pdfFileName(options.quotation));
}

/** Opens the browser print dialog with the generated document. */
export async function printQuotationPdf(options: BuildPdfOptions): Promise<void> {
  const doc = await buildQuotationPdf(options);
  doc.autoPrint();
  const url = doc.output("bloburl");
  const win = window.open(url as unknown as string, "_blank");
  if (!win) throw new Error("Pop-up blocked. Allow pop-ups to print, or use Download instead.");
}
