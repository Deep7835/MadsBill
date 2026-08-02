import { Suspense } from "react";
import type { Metadata } from "next";
import { QuotationsView } from "@/components/quotations/quotations-view";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={6} />}>
      <QuotationsView />
    </Suspense>
  );
}
