import { formatAmount, formatDate } from "@/lib/format";
import type { QuotationFull, Settings } from "@/lib/types/database";

/** Strips spaces/dashes and prefixes the Indian country code when missing. */
export function normalizeMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export interface ShareOptions {
  quotation: QuotationFull;
  settings: Settings | null;
  /** Public link to the document, appended when available. */
  documentUrl?: string;
}

export function buildWhatsappMessage({ quotation, settings, documentUrl }: ShareOptions): string {
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  const isInvoice = quotation.status === "invoice";
  const label = isInvoice ? "invoice" : "quotation";

  const lines = [
    `Hello ${quotation.customer?.contact_person || quotation.customer?.business_name || ""}`.trim() + ",",
    "",
    `Please find your ${label} from ${company}. Thank you.`,
    "",
    `${isInvoice ? "Invoice" : "Quote"} No: ${quotation.quote_number}`,
    `Date: ${formatDate(quotation.date)}`,
  ];

  if (!isInvoice && quotation.valid_until) {
    lines.push(`Valid until: ${formatDate(quotation.valid_until)}`);
  }

  lines.push(`Total: Rs. ${formatAmount(quotation.grand_total)}`);

  if (documentUrl) {
    lines.push("", `Download PDF: ${documentUrl}`);
  }

  if (settings?.phone) {
    lines.push("", `For any queries: ${settings.phone}`);
  }

  return lines.join("\n");
}

/** wa.me link — opens WhatsApp with the message prefilled. */
export function buildWhatsappUrl(options: ShareOptions): string {
  const mobile = normalizeMobile(options.quotation.customer?.mobile);
  const text = encodeURIComponent(buildWhatsappMessage(options));
  return mobile ? `https://wa.me/${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
}
