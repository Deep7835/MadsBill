import type { Metadata } from "next";
import { QuotationBuilder } from "@/components/quotations/quotation-builder";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; draft?: string; as?: string }>;
}) {
  const { customer, draft, as } = await searchParams;
  return (
    <QuotationBuilder
      presetCustomerId={customer}
      fromDraft={draft === "1"}
      presetStatus={as === "invoice" ? "invoice" : undefined}
    />
  );
}
