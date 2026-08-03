import { logCommunication } from "@/lib/queries";
import type { Customer, QuotationFull, Settings } from "@/lib/types/database";

export type WhatsAppMessageType =
  | "invoice"
  | "quotation"
  | "order_confirmation"
  | "payment_receipt"
  | "delivery_update";

export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d]/g, "");
  // If 10 digits (standard Indian mobile), prefix with country code 91
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

export const normalizeMobile = formatWhatsAppNumber;

export function buildWhatsAppMessage({
  type,
  customer,
  quotation,
  companyName = "Madskraft Flex & Advertising",
}: {
  type?: WhatsAppMessageType;
  customer?: Customer | null;
  quotation?: QuotationFull;
  companyName?: string;
}): string {
  const customerName = customer?.contact_person || customer?.business_name || "Customer";
  const quoteNo = quotation?.quote_number || "";
  const amount = quotation?.grand_total ? `₹${quotation.grand_total.toLocaleString("en-IN")}` : "";
  const msgType = type || (quotation?.status === "invoice" ? "invoice" : "quotation");

  switch (msgType) {
    case "invoice":
      return `📄 *INVOICE FROM ${companyName.toUpperCase()}*\n\nDear *${customerName}*,\nHere is your official Invoice *#${quoteNo}* for ${amount}.\n\nThank you for doing business with us!`;

    case "quotation":
      return `📋 *QUOTATION FROM ${companyName.toUpperCase()}*\n\nDear *${customerName}*,\nHere is your Quotation estimate *#${quoteNo}* for ${amount}.\n\nPlease let us know if you would like to proceed with the order.`;

    case "order_confirmation":
      return `✅ *ORDER CONFIRMED - ${companyName.toUpperCase()}*\n\nDear *${customerName}*,\nYour order *#${quoteNo}* has been confirmed and placed in production!\nTotal Amount: ${amount}.`;

    case "payment_receipt":
      return `💳 *PAYMENT RECEIPT - ${companyName.toUpperCase()}*\n\nDear *${customerName}*,\nWe have received payment for *#${quoteNo}* (${amount}). Thank you!`;

    case "delivery_update":
      return `🚚 *DELIVERY UPDATE - ${companyName.toUpperCase()}*\n\nDear *${customerName}*,\nYour print/flex materials for order *#${quoteNo}* are ready and out for delivery/pickup!`;

    default:
      return `Hello *${customerName}*, update regarding *#${quoteNo}* from ${companyName}.`;
  }
}

/** Legacy wrapper function for WhatsappShareDialog compatibility */
export function buildWhatsappMessage(options: {
  quotation: QuotationFull;
  settings?: Settings | null;
  documentUrl?: string;
}): string {
  const companyName = options.settings?.company_name ?? "Madskraft Flex & Advertising";
  return buildWhatsAppMessage({
    type: options.quotation.status === "invoice" ? "invoice" : "quotation",
    customer: options.quotation.customer,
    quotation: options.quotation,
    companyName,
  });
}

export function getWhatsAppClickToChatUrl({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): string {
  const formattedPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

export async function triggerWhatsAppShare({
  type,
  customer,
  quotation,
  companyName,
}: {
  type: WhatsAppMessageType;
  customer: Customer;
  quotation?: QuotationFull;
  companyName?: string;
}): Promise<string> {
  const recipient = formatWhatsAppNumber(customer.mobile);
  const message = buildWhatsAppMessage({ type, customer, quotation, companyName });

  if (customer.id) {
    await logCommunication({
      customer_id: customer.id,
      quotation_id: quotation?.id || null,
      channel: "whatsapp",
      type,
      recipient: customer.mobile || recipient,
      message,
      status: "sent",
    });
  }

  return getWhatsAppClickToChatUrl({ phone: recipient, message });
}
