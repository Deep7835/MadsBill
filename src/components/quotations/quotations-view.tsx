"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Invoice01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  ReceiptTextIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { DataList } from "@/components/shared/data-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { deleteQuotation, fetchQuotations } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import type { QuotationWithCustomer } from "@/lib/types/database";

type Filter = "all" | "quotation" | "invoice";

export function QuotationsView() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("status") as Filter) ?? "all";

  const { data, loading, refresh } = useAsyncData(() => fetchQuotations(), [], {
    errorMessage: "Could not load quotations",
  });

  // Seeded from the URL so the topbar search can jump straight into a filter.
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filter, setFilter] = useState<Filter>(
    initialFilter === "invoice" || initialFilter === "quotation" ? initialFilter : "all",
  );
  const [deleting, setDeleting] = useState<QuotationWithCustomer | null>(null);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((q) => q.status === filter);

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) =>
      [row.quote_number, row.customer?.business_name, row.customer?.mobile]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [data, filter, search]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteQuotation(deleting.id);
      toast.success(`${deleting.quote_number} deleted`);
      await refresh();
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Quotations &amp; invoices"
        description="Everything you have quoted and billed, newest first."
      >
        <Button asChild>
          <Link href="/quotations/new">
            <HugeiconsIcon icon={Add01Icon} />
            New quotation
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search number or customer…"
            />
            <div className="flex items-center gap-3">
              <SegmentedControl
                value={filter}
                onChange={setFilter}
                aria-label="Filter documents"
                segments={[
                  { value: "all", label: "All" },
                  { value: "quotation", label: "Quotations" },
                  { value: "invoice", label: "Invoices" },
                ]}
              />
              {!loading ? (
                <p className="hidden whitespace-nowrap text-xs text-muted-foreground lg:block">
                  {rows.length} shown
                </p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !rows.length ? (
            <EmptyState
              icon={Invoice01Icon}
              title={search || filter !== "all" ? "Nothing matches" : "No quotations yet"}
              description={
                search || filter !== "all"
                  ? "Try clearing the search or the filter."
                  : "Create your first quotation — the number is generated for you."
              }
              action={
                search || filter !== "all" ? null : (
                  <Button asChild size="sm">
                    <Link href="/quotations/new">New quotation</Link>
                  </Button>
                )
              }
            />
          ) : (
            <DataList
              rows={rows}
              rowKey={(row) => row.id}
              href={(row) => `/quotations/${row.id}`}
              columns={[
                {
                  key: "number",
                  header: "Number",
                  primary: true,
                  className: "whitespace-nowrap",
                  cell: (row) => (
                    <Link href={`/quotations/${row.id}`} className="font-medium hover:text-primary">
                      {row.quote_number}
                    </Link>
                  ),
                },
                {
                  key: "customer",
                  header: "Customer",
                  subtitle: true,
                  className: "max-w-[16rem] truncate",
                  cell: (row) => row.customer?.business_name ?? "—",
                },
                {
                  key: "date",
                  header: "Date",
                  className: "whitespace-nowrap",
                  cell: (row) => (
                    <span className="text-muted-foreground">{formatDate(row.date)}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => (
                    <div className="flex flex-wrap gap-1.5">
                      <DocStatusBadge status={row.status} />
                      {row.status === "invoice" ? (
                        <PaymentStatusBadge status={row.payment_status} />
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "total",
                  header: "Total",
                  align: "right",
                  className: "whitespace-nowrap font-medium",
                  cell: (row) => formatCurrency(row.grand_total),
                },
              ]}
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Document actions">
                      <HugeiconsIcon icon={MoreHorizontalIcon} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/quotations/${row.id}`}>
                        <HugeiconsIcon icon={ReceiptTextIcon} />
                        Open
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/quotations/${row.id}/edit`}>
                        <HugeiconsIcon icon={PencilEdit01Icon} />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setDeleting(row)}>
                      <HugeiconsIcon icon={Delete02Icon} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.quote_number ?? "document"}?`}
        description="The document and all its line items will be removed permanently."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
