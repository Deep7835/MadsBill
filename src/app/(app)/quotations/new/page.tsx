import type { Metadata } from "next";
import { QuotationBuilder } from "@/components/quotations/quotation-builder";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  return <QuotationBuilder presetCustomerId={customer} />;
}
