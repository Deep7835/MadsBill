"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Alert02Icon,
  BoxesIcon,
  Clock01Icon,
  MoneyBag02Icon,
  MoreHorizontalIcon,
  PackageIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/shared/page-header";
import { DataList } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { StockEntryDialog, type EntryMode } from "@/components/inventory/stock-entry-dialog";
import { StockSettingsDialog } from "@/components/inventory/stock-settings-dialog";
import { StockHistoryDialog } from "@/components/inventory/stock-history-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchInventory } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  INVENTORY_MIGRATION,
  isInventoryMissing,
  needsReorder,
  stockStatus,
  stockUnit,
  type StockStatus,
} from "@/lib/inventory";
import type { StockItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Filter = "all" | "reorder" | "untracked";

const STATUS_BADGE: Record<StockStatus, { label: string; variant: "success" | "warning" | "destructive" | "outline" | "secondary" }> = {
  ok: { label: "In stock", variant: "success" },
  low: { label: "Low stock", variant: "warning" },
  out: { label: "Out of stock", variant: "destructive" },
  empty: { label: "No stock", variant: "outline" },
  untracked: { label: "Not tracked", variant: "secondary" },
};

const stockValue = (item: StockItem) =>
  item.track_stock && item.on_hand > 0 ? item.on_hand * Number(item.cost_price) : 0;

export function InventoryView() {
  const { data, loading, error, refresh } = useAsyncData(fetchInventory, [], {
    errorMessage: "Could not load inventory",
    toastOnError: false,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [entry, setEntry] = useState<{ item: StockItem; mode: EntryMode } | null>(null);
  const [settingsItem, setSettingsItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);

  const items = useMemo(() => (data ?? []).filter((p) => p.is_active || p.on_hand !== 0), [data]);
  const tracked = items.filter((i) => i.track_stock);
  const reorder = tracked.filter(needsReorder);
  const totalValue = tracked.reduce((sum, i) => sum + stockValue(i), 0);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) =>
        filter === "reorder" ? needsReorder(i) : filter === "untracked" ? !i.track_stock : i.track_stock,
      )
      .filter((i) => !q || `${i.name} ${i.category ?? ""}`.toLowerCase().includes(q));
  }, [items, filter, search]);

  if (isInventoryMissing(error)) {
    return (
      <>
        <PageHeader title="Inventory" description="Material stock register" />
        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <p className="font-semibold">One-time database setup needed</p>
            <p className="text-muted-foreground">
              Open the Supabase SQL editor, paste the contents of{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{INVENTORY_MIGRATION}</code>{" "}
              and run it. Then reload this page.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const openEntry = (item: StockItem, mode: EntryMode) => setEntry({ item, mode });

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Material stock register. Invoices deduct stock automatically; costs here are internal only."
      />

      <div
        className={cn(
          "grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900",
          "[&>*+*]:border-t sm:[&>*+*]:border-t-0 sm:[&>*+*]:border-l [&>*]:border-slate-200 dark:[&>*]:border-slate-800",
        )}
      >
        <StatCard bare label="Stock value (at cost)" value={formatCurrency(totalValue)} icon={MoneyBag02Icon} tone="info" />
        <StatCard
          bare
          label="Needs reordering"
          value={String(reorder.length)}
          fill={tracked.length ? reorder.length / tracked.length : 0}
          icon={Alert02Icon}
          tone={reorder.length ? "danger" : "success"}
        />
        <StatCard bare label="Materials tracked" value={String(tracked.length)} icon={BoxesIcon} tone="default" />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              aria-label="Filter inventory"
              segments={[
                { value: "all", label: "Stock items" },
                { value: "reorder", label: `Reorder${reorder.length ? ` (${reorder.length})` : ""}` },
                { value: "untracked", label: "Services" },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search materials…" />
          </div>

          {loading ? (
            <TableSkeleton rows={7} cols={6} />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              {error}
              <Button variant="outline" onClick={() => void refresh()}>
                Try again
              </Button>
            </div>
          ) : !rows.length ? (
            <EmptyState
              icon={PackageIcon}
              title={
                search
                  ? "No matching materials"
                  : filter === "reorder"
                    ? "Nothing needs reordering"
                    : filter === "untracked"
                      ? "No services"
                      : "No stock items"
              }
              description={
                filter === "reorder"
                  ? "Set a reorder level on a material to be warned before it runs out."
                  : filter === "untracked"
                    ? "Products marked as services show here and are never deducted."
                    : "Products you add in Products & Rates appear here automatically."
              }
            />
          ) : (
            <DataList
              rows={rows}
              rowKey={(i) => i.id}
              columns={[
                {
                  key: "name",
                  header: "Material",
                  primary: true,
                  cell: (i) => (
                    <button
                      type="button"
                      onClick={() => setHistoryItem(i)}
                      className="text-left font-medium hover:text-primary"
                    >
                      {i.name}
                    </button>
                  ),
                },
                {
                  key: "category",
                  header: "Category",
                  subtitle: true,
                  hideBelow: "lg",
                  cell: (i) => <span className="text-muted-foreground">{i.category || "—"}</span>,
                },
                {
                  key: "stock",
                  header: "In stock",
                  align: "right",
                  cell: (i) => (
                    <span
                      className={cn(
                        "whitespace-nowrap font-semibold tabular-nums",
                        i.on_hand < 0 && "text-destructive",
                      )}
                    >
                      {formatNumber(i.on_hand)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{stockUnit(i)}</span>
                    </span>
                  ),
                },
                {
                  key: "reorder",
                  header: "Reorder at",
                  align: "right",
                  hideBelow: "md",
                  cell: (i) => (
                    <span className="tabular-nums text-muted-foreground">
                      {Number(i.reorder_level) > 0 ? formatNumber(i.reorder_level) : "—"}
                    </span>
                  ),
                },
                {
                  key: "cost",
                  header: "Cost / unit",
                  align: "right",
                  cell: (i) => (
                    <span className="whitespace-nowrap tabular-nums">
                      {Number(i.cost_price) > 0 ? formatCurrency(i.cost_price) : "—"}
                    </span>
                  ),
                },
                {
                  key: "rate",
                  header: "Sale rate",
                  align: "right",
                  hideBelow: "lg",
                  cell: (i) => (
                    <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatCurrency(i.default_rate)}
                    </span>
                  ),
                },
                {
                  key: "value",
                  header: "Stock value",
                  align: "right",
                  hideBelow: "md",
                  cell: (i) => (
                    <span className="whitespace-nowrap font-medium tabular-nums">
                      {stockValue(i) > 0 ? formatCurrency(stockValue(i)) : "—"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (i) => {
                    const badge = STATUS_BADGE[stockStatus(i)];
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  },
                },
              ]}
              actions={(i) => (
                <div className="flex items-center justify-end gap-1">
                  {i.track_stock ? (
                    <Button variant="outline" size="sm" onClick={() => openEntry(i, "purchase")}>
                      <HugeiconsIcon icon={Add01Icon} />
                      Stock in
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`More actions for ${i.name}`}>
                        <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {i.track_stock ? (
                        <>
                          <DropdownMenuItem onSelect={() => openEntry(i, "usage")}>Record usage</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEntry(i, "wastage")}>Record wastage</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEntry(i, "adjustment")}>Stock count</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEntry(i, "opening")}>Opening stock</DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem onSelect={() => setHistoryItem(i)}>
                        <HugeiconsIcon icon={Clock01Icon} />
                        Stock history
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setSettingsItem(i)}>
                        <HugeiconsIcon icon={Settings01Icon} />
                        Cost &amp; reorder level
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <StockEntryDialog
        item={entry?.item ?? null}
        mode={entry?.mode ?? "purchase"}
        onOpenChange={(open) => !open && setEntry(null)}
        onSaved={refresh}
      />
      <StockSettingsDialog
        item={settingsItem}
        onOpenChange={(open) => !open && setSettingsItem(null)}
        onSaved={refresh}
      />
      <StockHistoryDialog
        item={historyItem ? (data?.find((d) => d.id === historyItem.id) ?? historyItem) : null}
        onOpenChange={(open) => !open && setHistoryItem(null)}
        onChanged={refresh}
      />
    </>
  );
}
