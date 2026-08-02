"use client";

import Link from "next/link";
import {
  Calculator,
  FileText,
  FilePlus2,
  IndianRupee,
  Package,
  ReceiptText,
  Users,
  UserPlus,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList } from "@/components/shared/data-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchDashboard } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";

const QUICK_ACTIONS = [
  { href: "/calculator", label: "Price calculator", icon: Calculator },
  { href: "/quotations/new", label: "New quotation", icon: FilePlus2 },
  { href: "/customers", label: "Add customer", icon: UserPlus },
  { href: "/products", label: "Manage products", icon: Package },
  { href: "/quotations?status=invoice", label: "View invoices", icon: ReceiptText },
];

export function DashboardView() {
  const { data, loading, error, refresh } = useAsyncData(fetchDashboard, [], {
    errorMessage: "Could not load dashboard",
  });

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your quotations, invoices and payments.">
        <Button asChild>
          <Link href="/quotations/new">
            <FilePlus2 />
            New quotation
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <CardGridSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Quotations"
            value={String(data?.quotationCount ?? 0)}
            hint="Awaiting conversion"
            icon={FileText}
          />
          <StatCard
            label="Customers"
            value={String(data?.customerCount ?? 0)}
            hint="In your address book"
            icon={Users}
          />
          <StatCard
            label="Total sales"
            value={formatCurrency(data?.totalSales ?? 0)}
            hint={`${data?.invoiceCount ?? 0} invoice${data?.invoiceCount === 1 ? "" : "s"} raised`}
            icon={IndianRupee}
            tone="success"
          />
          <StatCard
            label="Pending payments"
            value={formatCurrency(data?.pendingAmount ?? 0)}
            hint="Unpaid or partly paid invoices"
            icon={Wallet}
            tone="warning"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent quotations</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/quotations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : !data?.recent.length ? (
              <EmptyState
                icon={FileText}
                title="No quotations yet"
                description="Create your first quotation to see it here."
                action={
                  <Button asChild size="sm">
                    <Link href="/quotations/new">New quotation</Link>
                  </Button>
                }
              />
            ) : (
              <DataList
                rows={data.recent}
                rowKey={(q) => q.id}
                href={(q) => `/quotations/${q.id}`}
                columns={[
                  {
                    key: "number",
                    header: "Number",
                    primary: true,
                    className: "whitespace-nowrap",
                    cell: (q) => (
                      <Link href={`/quotations/${q.id}`} className="font-medium hover:text-primary">
                        {q.quote_number}
                      </Link>
                    ),
                  },
                  {
                    key: "customer",
                    header: "Customer",
                    subtitle: true,
                    className: "max-w-[14rem] truncate",
                    cell: (q) => q.customer?.business_name ?? "—",
                  },
                  {
                    key: "date",
                    header: "Date",
                    hideBelow: "lg",
                    className: "whitespace-nowrap",
                    cell: (q) => <span className="text-muted-foreground">{formatDate(q.date)}</span>,
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (q) => (
                      <div className="flex flex-wrap gap-1.5">
                        <DocStatusBadge status={q.status} />
                        {q.status === "invoice" ? (
                          <PaymentStatusBadge status={q.payment_status} />
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "total",
                    header: "Total",
                    align: "right",
                    className: "whitespace-nowrap font-medium",
                    cell: (q) => formatCurrency(q.grand_total),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Button key={href} asChild variant="outline" className="justify-start">
                <Link href={href}>
                  <Icon />
                  {label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
