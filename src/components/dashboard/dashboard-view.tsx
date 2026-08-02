"use client";

import Link from "next/link";
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchDashboard } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";

const QUICK_ACTIONS = [
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.map((q) => (
                    <TableRow key={q.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link href={`/quotations/${q.id}`} className="hover:text-primary">
                          {q.quote_number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate">
                        {q.customer?.business_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
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
