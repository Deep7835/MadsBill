"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText, MoreHorizontal, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const [search, setSearch] = useState("");
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
            <Plus />
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
              <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All documents</SelectItem>
                  <SelectItem value="quotation">Quotations</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                </SelectContent>
              </Select>
              {!loading ? (
                <p className="hidden text-xs text-muted-foreground sm:block">{rows.length} shown</p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !rows.length ? (
            <EmptyState
              icon={FileText}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link href={`/quotations/${row.id}`} className="hover:text-primary">
                        {row.quote_number}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate">
                      {row.customer?.business_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <DocStatusBadge status={row.status} />
                        {row.status === "invoice" ? (
                          <PaymentStatusBadge status={row.payment_status} />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      {formatCurrency(row.grand_total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Document actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/quotations/${row.id}`}>
                              <ReceiptText />
                              Open
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/quotations/${row.id}/edit`}>
                              <Pencil />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setDeleting(row)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
