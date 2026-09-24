"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-async-data";
import { deleteStockMovement, fetchStockMovements } from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { KIND_LABEL, stockUnit } from "@/lib/inventory";
import type { StockItem, StockMovement } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function StockHistoryDialog({
  item,
  onOpenChange,
  onChanged,
}: {
  item: StockItem | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}) {
  const fetcher = useCallback(
    () => (item ? fetchStockMovements(item.id) : Promise.resolve([])),
    [item],
  );
  const { data, loading, refresh } = useAsyncData(fetcher, [item?.id], {
    errorMessage: "Could not load stock history",
  });
  const [deleting, setDeleting] = useState<StockMovement | null>(null);

  if (!item) return null;
  const unit = stockUnit(item);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteStockMovement(deleting.id);
      toast.success("Entry removed");
      await Promise.all([refresh(), onChanged()]);
    } catch (err) {
      toast.error("Could not remove the entry", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.name} — stock history</DialogTitle>
          <DialogDescription>
            {formatNumber(item.on_hand)} {unit} in stock. Invoice entries follow the invoice; edit or
            delete the invoice to change them.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No stock entries yet. Add opening stock or a purchase to start.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {KIND_LABEL[m.kind]}
                      {m.kind === "invoice" && m.quotation_id ? (
                        <Link
                          href={`/quotations/${m.quotation_id}`}
                          className="ml-1.5 text-primary hover:underline"
                        >
                          {m.note}
                        </Link>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(m.date)}
                      {m.supplier ? ` · ${m.supplier}` : ""}
                      {m.unit_cost ? ` · ${formatCurrency(m.unit_cost)}/${unit}` : ""}
                      {m.kind !== "invoice" && m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      m.qty > 0 ? "text-[var(--success)]" : "text-destructive",
                    )}
                  >
                    {m.qty > 0 ? "+" : "−"}
                    {formatNumber(Math.abs(m.qty))} {unit}
                  </span>
                  {m.kind === "invoice" ? (
                    <span className="size-8 shrink-0" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleting(m)}
                      aria-label="Remove entry"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Remove this stock entry?"
          description="The stock balance is recalculated without it."
          confirmLabel="Remove"
          onConfirm={handleDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
