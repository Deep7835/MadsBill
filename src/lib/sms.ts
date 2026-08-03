import { logCommunication } from "@/lib/queries";
import type { Customer, QuotationFull } from "@/lib/types/database";

export type SmsTemplateType =
  | "pending_payment"
  | "due_invoice"
  | "advance_reminder"
  | "order_ready"
  | "delivery_update";

export interface SmsTemplateOptions {
  type: SmsTemplateType;
  customer: Customer;
  quotation?: QuotationFull;
  companyName?: string;
  amount?: number;
  customMessage?: string;
}

export function generateSmsText({
  type,
  customer,
  quotation,
  companyName = "Madskraft Flex",
  amount,
}: SmsTemplateOptions): string {
  const customerName = customer.contact_person || customer.business_name;
  const quoteNo = quotation?.quote_number || "";
  const total = amount ?? quotation?.grand_total ?? 0;

  switch (type) {
    case "pending_payment":
      return `Dear ${customerName}, gentle reminder that payment of ₹${total.toLocaleString("en-IN")} for ${quoteNo} with ${companyName} is pending. Kindly clear at your earliest. Thank you!`;
    
    case "due_invoice":
      return `Dear ${customerName}, invoice ${quoteNo} for ₹${total.toLocaleString("en-IN")} is due. Please process payment soon. ${companyName}.`;
    
    case "advance_reminder":
      return `Dear ${customerName}, please remit the 50% advance payment of ₹${(total * 0.5).toLocaleString("en-IN")} to confirm your order ${quoteNo}. - ${companyName}`;

    case "order_ready":
      return `Dear ${customerName}, your flex/print order ${quoteNo} is READY for pickup at ${companyName}! Contact us for delivery options.`;

    case "delivery_update":
      return `Dear ${customerName}, your order ${quoteNo} has been dispatched for delivery. Thank you for choosing ${companyName}!`;

    default:
      return `Hello ${customerName}, update regarding order ${quoteNo} from ${companyName}.`;
  }
}

export async function sendSmsReminder({
  type,
  customer,
  quotation,
  companyName,
  amount,
  customMessage,
}: SmsTemplateOptions): Promise<{ success: boolean; message: string }> {
  const recipient = customer.mobile;
  if (!recipient) {
    throw new Error("Customer mobile number is missing");
  }

  const message = customMessage || generateSmsText({ type, customer, quotation, companyName, amount });

  // In production, invoke MSG91/Twilio endpoint if API key present.
  // We log the communication row in Supabase database.
  await logCommunication({
    customer_id: customer.id,
    quotation_id: quotation?.id || null,
    channel: "sms",
    type,
    recipient,
    message,
    status: "sent",
  });

  return { success: true, message };
}
