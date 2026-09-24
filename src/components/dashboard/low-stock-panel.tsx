"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { useAsyncData } from "@/hooks/use-async-data";
import { fetchInventory } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { needsReorder, stockUnit } from "@/lib/inventory";
import { cn } from "@/lib/utils";

/**
 * Warns about materials at or below their reorder level. Stays silent when
 * nothing needs ordering or inventory is not set up, so it never adds noise.
 */
export function LowStockPanel({ className }: { className?: string }) {
  const { data } = useAsyncData(fetchInventory, [], { toastOnError: false });
  const low = (data ?? [])
    .filter((i) => i.track_stock && needsReorder(i))
    .sort((a, b) => a.on_hand / Number(a.reorder_level) - b.on_hand / Number(b.reorder_level));

  if (!low.length) return null;

  return (
    <div
      className={cn(
        "rounded-[14px] border border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
            <AlertTriangle className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">Low stock</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {low.length} {low.length === 1 ? "material is" : "materials are"} at or below the reorder level
            </p>
          </div>
        </div>
        <Link
          href="/inventory"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
        >
          Inventory <ArrowRight className="size-4" />
        </Link>
      </div>
      <ul className="space-y-1.5 px-5 pb-4">
        {low.slice(0, 6).map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2 text-sm dark:bg-slate-900"
          >
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                item.on_hand <= 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400",
              )}
            >
              {item.on_hand <= 0 ? "Out" : formatNumber(item.on_hand)}
              <span className="text-slate-400"> / {formatNumber(item.reorder_level)} {stockUnit(item)}</span>
            </span>
          </li>
        ))}
      </ul>
      {low.length > 6 ? (
        <p className="px-5 pb-4 text-xs text-slate-500">+{low.length - 6} more on the Inventory page</p>
      ) : null}
    </div>
  );
}
