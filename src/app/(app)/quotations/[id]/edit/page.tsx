import type { Metadata } from "next";
import { QuotationEditView } from "@/components/quotations/quotation-edit-view";

export const metadata: Metadata = { title: "Edit document" };

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotationEditView quotationId={id} />;
}
