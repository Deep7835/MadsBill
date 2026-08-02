"use client";

import { useCallback } from "react";
import Link from "next/link";

import { QuotationBuilder } from "@/components/quotations/quotation-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchQuotation } from "@/lib/queries";

export function QuotationEditView({ quotationId }: { quotationId: string }) {
  const fetcher = useCallback(() => fetchQuotation(quotationId), [quotationId]);
  const { data, loading, error } = useAsyncData(fetcher, [quotationId], {
    errorMessage: "Could not load the document",
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Document not found."}</p>
          <Button asChild variant="outline">
            <Link href="/quotations">Back to quotations</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <QuotationBuilder quotation={data} />;
}
