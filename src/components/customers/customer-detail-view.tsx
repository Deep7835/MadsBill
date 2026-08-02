"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchCustomer, fetchQuotations } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const [editOpen, setEditOpen] = useState(false);

  const customerFetcher = useCallback(() => fetchCustomer(customerId), [customerId]);
  const historyFetcher = useCallback(() => fetchQuotations({ customerId }), [customerId]);

  const { data: customer, loading, refresh } = useAsyncData(customerFetcher, [customerId], {
    errorMessage: "Could not load customer",
  });
  const { data: history, loading: historyLoading } = useAsyncData(historyFetcher, [customerId], {
    errorMessage: "Could not load history",
  });

  const invoices = (history ?? []).filter((q) => q.status === "invoice");
  const billed = invoices.reduce((sum, q) => sum + Number(q.grand_total ?? 0), 0);
  const pending = invoices
    .filter((q) => q.payment_status !== "paid")
    .reduce((sum, q) => sum + Number(q.grand_total ?? 0), 0);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/customers">
          <ArrowLeft />
          All customers
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="h-10 w-64" />
      ) : (
        <PageHeader
          title={customer?.business_name ?? "Customer"}
          description={customer?.contact_person ? `Contact: ${customer.contact_person}` : undefined}
        >
          <Button variant="outline" onClick={() => setEditOpen(true)} disabled={!customer}>
            <Pencil />
            Edit
          </Button>
          <Button asChild>
            <Link href={`/quotations/new?customer=${customerId}`}>
              <FileText />
              New quotation
            </Link>
          </Button>
        </PageHeader>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </>
            ) : (
              <>
                <DetailRow icon={Phone} value={customer?.mobile} />
                <DetailRow icon={Mail} value={customer?.email} />
                <DetailRow icon={Building2} value={customer?.gst_number} mono />
                <DetailRow
                  icon={MapPin}
                  value={[customer?.address, customer?.city, customer?.state]
                    .filter(Boolean)
                    .join(", ")}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:content-start">
          <StatCard
            label="Documents"
            value={String(history?.length ?? 0)}
            hint={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
            icon={FileText}
          />
          <StatCard
            label="Total billed"
            value={formatCurrency(billed)}
            hint={pending ? `${formatCurrency(pending)} pending` : "All settled"}
            icon={Receipt}
            tone={pending ? "warning" : "success"}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotations &amp; invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : !history?.length ? (
            <EmptyState
              icon={FileText}
              title="Nothing raised yet"
              description="Quotations you create for this customer will show up here."
              action={
                <Button asChild size="sm">
                  <Link href={`/quotations/new?customer=${customerId}`}>New quotation</Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      <Link href={`/quotations/${q.id}`} className="hover:text-primary">
                        {q.quote_number}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(q.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <DocStatusBadge status={q.status} />
                        {q.status === "invoice" ? (
                          <PaymentStatusBadge status={q.payment_status} />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      {formatCurrency(q.grand_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={() => void refresh()}
      />
    </>
  );
}

function DetailRow({
  icon: Icon,
  value,
  mono,
}: {
  icon: typeof Phone;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className={value ? (mono ? "font-mono text-xs" : "") : "text-muted-foreground"}>
        {value || "—"}
      </span>
    </div>
  );
}
