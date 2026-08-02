import type { jsPDF } from "jspdf";

import { text } from "@/lib/pdf/draw";
import { drawInvoice } from "@/lib/pdf/layouts/invoice";
import { drawQuotation } from "@/lib/pdf/layouts/quotation";
import { COLORS, CONTENT_RIGHT, FONT, PAGE } from "@/lib/pdf/theme";
import type { QuotationFull, Settings } from "@/lib/types/database";

export interface BuildPdfOptions {
  quotation: QuotationFull;
  settings: Settings | null;
}

export interface LoadedLogo {
  dataUrl: string;
  format: string;
}

async function loadLogo(url: string): Promise<LoadedLogo | null> {
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

/** Page frame and footer, applied to every page once the body is laid out. */
function paintChrome(doc: jsPDF, quotation: QuotationFull, company: string) {
  const title = quotation.status === "invoice" ? "INVOICE" : "QUOTATION";
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.ink);
    doc.setLineWidth(0.5);
    doc.rect(
      PAGE.margin - 2,
      PAGE.margin - 2,
      PAGE.width - (PAGE.margin - 2) * 2,
      PAGE.height - (PAGE.margin - 2) * 2,
      "S",
    );

    text(doc, `${company}  |  ${title} ${quotation.quote_number}`, PAGE.margin, PAGE.height - 6, {
      size: FONT.tiny,
      color: COLORS.muted,
    });
    text(doc, `Page ${page} of ${pages}`, CONTENT_RIGHT, PAGE.height - 6, {
      size: FONT.tiny,
      color: COLORS.muted,
      align: "right",
    });
  }
}

/**
 * Builds the A4 document. Invoices and quotations use genuinely different
 * layouts, matching the printed templates each is modelled on.
 */
export async function buildQuotationPdf({
  quotation,
  settings,
}: BuildPdfOptions): Promise<jsPDF> {
  // jsPDF is ~150 kB — loaded only when someone actually asks for a document.
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const logo = settings?.logo_url ? await loadLogo(settings.logo_url) : null;
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";

  if (quotation.status === "invoice") {
    drawInvoice(doc, quotation, settings, logo);
  } else {
    drawQuotation(doc, quotation, settings, logo);
  }

  paintChrome(doc, quotation, company);
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
