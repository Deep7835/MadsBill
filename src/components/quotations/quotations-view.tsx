"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal, Edit, Trash2, ExternalLink, FileText, Filter } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsyncData } from "@/hooks/use-async-data";
import { deleteQuotation, fetchQuotations } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import type { QuotationWithCustomer } from "@/lib/types/database";

type FilterStatus = "all" | "quotation" | "invoice";

export function QuotationsView() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("status") as FilterStatus) ?? "all";

  const { data, loading, refresh } = useAsyncData(() => fetchQuotations(), [], {
    errorMessage: "Could not load quotations",
  });

  const [filter, setFilter] = useState<FilterStatus>(
    initialFilter === "invoice" || initialFilter === "quotation" ? initialFilter : "all"
  );
  const [deleting, setDeleting] = useState<QuotationWithCustomer | null>(null);

  const filteredRows = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((q) => q.status === filter);
    return list;
  }, [data, filter]);

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

  const columns: Column<QuotationWithCustomer>[] = [
    {
      key: "quote_number",
      header: "Document No.",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold">
            <FileText className="size-4" />
          </div>
          <Link href={`/quotations/${row.id}`} className="font-bold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
            {row.quote_number}
          </Link>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {row.customer?.business_name ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.date)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <DocStatusBadge status={row.status} />
          {row.status === "invoice" && <PaymentStatusBadge status={row.payment_status} />}
        </div>
      ),
    },
    {
      key: "grand_total",
      header: "Amount",
      sortable: true,
      className: "text-right font-bold text-slate-900 dark:text-slate-100",
      render: (row) => formatCurrency(row.grand_total),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" aria-label="Document actions">
              <MoreHorizontal className="size-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem asChild>
              <Link href={`/quotations/${row.id}`}>
                <ExternalLink className="mr-2 size-4 text-slate-500" />
                Open Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/quotations/${row.id}/edit`}>
                <Edit className="mr-2 size-4 text-slate-500" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setDeleting(row)}>
              <Trash2 className="mr-2 size-4 text-rose-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations &amp; Invoices"
        description="View, manage, and filter all generated client documents."
      >
        <Button asChild className="rounded-xl bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700">
          <Link href="/quotations/new">
            <Plus className="mr-1.5 size-4" />
            New Quotation
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          aria-label="Filter documents"
          segments={[
            { value: "all", label: "All Documents" },
            { value: "quotation", label: "Quotations Only" },
            { value: "invoice", label: "Tax Invoices Only" },
          ]}
        />
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search quote number or customer name..."
        emptyMessage="No documents match your filter. Click 'New Quotation' to create one."
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.quote_number ?? "document"}?`}
        description="The document and all its line items will be removed permanently."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
