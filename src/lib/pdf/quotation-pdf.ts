import type { jsPDF } from "jspdf";
import QRCode from "qrcode";

import { text } from "@/lib/pdf/draw";
import { drawInvoice } from "@/lib/pdf/layouts/invoice";
import { drawQuotation } from "@/lib/pdf/layouts/quotation";
import { COLORS, CONTENT_RIGHT, FONT, PAGE } from "@/lib/pdf/theme";
import type { QuotationFull, Settings } from "@/lib/types/database";
import { buildUpiUrl } from "@/components/shared/qr-code";

export interface BuildPdfOptions {
  quotation: QuotationFull;
  settings: Settings | null;
}

export interface LoadedImage {
  dataUrl: string;
  format: string;
}

export interface LoadedPdfAssets {
  logo: LoadedImage | null;
  stamp: LoadedImage | null;
  signature: LoadedImage | null;
  upiQr: LoadedImage | null;
}

async function loadImage(url: string | null | undefined): Promise<LoadedImage | null> {
  if (!url) return null;
  if (url.startsWith("data:image/")) {
    const match = url.match(/^data:image\/(\w+);base64,/);
    const format = match ? (match[1].toUpperCase() === "PNG" ? "PNG" : "JPEG") : "JPEG";
    return { dataUrl: url, format };
  }
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format = blob.type.includes("png") ? "PNG" : blob.type.includes("webp") ? "WEBP" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("image read failed"));
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}

async function generateUpiQrDataUrl(
  settings: Settings | null,
  amount: number,
  quoteNumber: string
): Promise<LoadedImage | null> {
  if (!settings?.upi_id) return null;
  try {
    const upiUrl = buildUpiUrl(
      settings.upi_id,
      settings.upi_name || settings.company_name,
      amount,
      `Payment for ${quoteNumber}`
    );
    const dataUrl = await QRCode.toDataURL(upiUrl, { width: 200, margin: 1 });
    return { dataUrl, format: "PNG" };
  } catch {
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
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const [logo, stamp, signature, upiQr] = await Promise.all([
    loadImage(settings?.logo_url),
    loadImage(settings?.stamp_url),
    loadImage(settings?.signature_url),
    generateUpiQrDataUrl(settings, quotation.grand_total, quotation.quote_number),
  ]);

  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  const assets: LoadedPdfAssets = { logo, stamp, signature, upiQr };

  if (quotation.status === "invoice") {
    drawInvoice(doc, quotation, settings, assets);
  } else {
    drawQuotation(doc, quotation, settings, assets);
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
