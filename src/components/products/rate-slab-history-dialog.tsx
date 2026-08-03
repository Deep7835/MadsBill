"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchRateSlabHistory } from "@/lib/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface RateSlabHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
}

export function RateSlabHistoryDialog({
  open,
  onOpenChange,
  productId,
}: RateSlabHistoryDialogProps) {
  const { data: logs, loading } = useAsyncData(
    () => fetchRateSlabHistory(productId),
    [open, productId],
    { errorMessage: "Could not load rate slab history" }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <HugeiconsIcon icon={Clock01Icon} className="h-5 w-5" />
            Rate Slab Audit Log
          </DialogTitle>
          <DialogDescription>
            History of rate slab updates, price adjustments, and reasons for change.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1 py-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No rate slab changes recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border bg-card p-3.5 space-y-1.5 text-xs shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground text-sm">
                    {log.product_name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(log.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    Old: {formatCurrency(Number(log.old_rate ?? 0))}
                  </Badge>
                  <span className="text-muted-foreground font-bold">→</span>
                  <Badge variant="default" className="font-mono bg-emerald-600">
                    New: {formatCurrency(Number(log.new_rate ?? 0))}
                  </Badge>
                </div>

                {log.reason ? (
                  <p className="text-muted-foreground italic bg-muted/40 p-1.5 rounded">
                    Reason: &ldquo;{log.reason}&rdquo;
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
