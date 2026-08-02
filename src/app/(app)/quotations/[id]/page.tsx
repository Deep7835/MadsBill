import type { Metadata } from "next";
import { QuotationDetailView } from "@/components/quotations/quotation-detail-view";

export const metadata: Metadata = { title: "Document" };

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotationDetailView quotationId={id} />;
}
