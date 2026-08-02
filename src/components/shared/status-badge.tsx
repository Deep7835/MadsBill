import { Badge } from "@/components/ui/badge";
import type { PaymentStatus, QuotationStatus } from "@/lib/types/database";

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

const PAYMENT_VARIANT: Record<PaymentStatus, "destructive" | "warning" | "success"> = {
  unpaid: "destructive",
  partial: "warning",
  paid: "success",
};

export function DocStatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <Badge variant={status === "invoice" ? "default" : "secondary"}>
      {status === "invoice" ? "Invoice" : "Quotation"}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{PAYMENT_LABEL[status]}</Badge>;
}
