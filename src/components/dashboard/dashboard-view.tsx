"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CalculatorIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  AddInvoiceIcon,
  Invoice01Icon,
  RupeeIcon,
  PackageIcon,
  ReceiptTextIcon,
  AnalyticsUpIcon,
  UserAdd01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UnitConverter } from "@/components/calculator/unit-converter";
import { CardGridSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList } from "@/components/shared/data-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchDashboard } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";

const QUICK_ACTIONS = [
  { href: "/calculator", label: "Price Calculator", icon: CalculatorIcon },
  { href: "/quotations/new", label: "New Quotation", icon: AddInvoiceIcon },
  { href: "/customers", label: "Add Customer", icon: UserAdd01Icon },
  { href: "/products", label: "Rate Slabs & Products", icon: PackageIcon },
  { href: "/quotations?status=invoice", label: "View Invoices", icon: ReceiptTextIcon },
];

export function DashboardView() {
  const { data, loading, error, refresh } = useAsyncData(fetchDashboard, [], {
    errorMessage: "Could not load dashboard",
  });

  return (
    <>
      <PageHeader
        title="Business Dashboard"
        description="Real-time sales statistics, order tracking, and quick billing tools."
      >
        <div className="flex items-center gap-2">
          <UnitConverter triggerLabel="Unit Converter" variant="outline" size="default" />
          <Button asChild>
            <Link href="/quotations/new">
              <HugeiconsIcon icon={AddInvoiceIcon} className="h-4 w-4 mr-1" />
              New Quote / Bill
            </Link>
          </Button>
        </div>
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
        <div className="space-y-6">
          {/* Top Key Performance Indicator Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Today's Sales"
              value={formatCurrency(data?.todaySales ?? 0)}
              hint="Invoices raised today"
              icon={AnalyticsUpIcon}
              tone="success"
            />
            <StatCard
              label="Monthly Sales"
              value={formatCurrency(data?.monthlySales ?? 0)}
              hint="Current month total"
              icon={RupeeIcon}
              tone="success"
            />
            <StatCard
              label="Pending Payments"
              value={formatCurrency(data?.pendingAmount ?? 0)}
              hint="Outstanding balance"
              icon={Wallet01Icon}
              tone="warning"
            />
            <StatCard
              label="Pending Orders"
              value={String(data?.pendingOrdersCount ?? 0)}
              hint={`${data?.deliveredCount ?? 0} orders delivered`}
              icon={Clock01Icon}
            />
            <StatCard
              label="Total Customers"
              value={String(data?.customerCount ?? 0)}
              hint="Active client directory"
              icon={UserGroupIcon}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Recent Orders & Quotations */}
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 text-primary" />
                  Recent Billing Activities
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/quotations">
                    View all <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!data?.recent.length ? (
                  <EmptyState
                    icon={Invoice01Icon}
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
                        header: "Document No.",
                        primary: true,
                        className: "whitespace-nowrap",
                        cell: (q) => (
                          <Link href={`/quotations/${q.id}`} className="font-semibold text-primary hover:underline">
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
                        cell: (q) => <span className="text-muted-foreground text-xs">{formatDate(q.date)}</span>,
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
                        header: "Grand Total",
                        align: "right",
                        className: "whitespace-nowrap font-semibold",
                        cell: (q) => formatCurrency(q.grand_total),
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>

            {/* Right Column: Quick Tools & Stats */}
            <div className="space-y-4">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Quick Business Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                    <Button key={href} asChild variant="outline" className="justify-between group">
                      <Link href={href}>
                        <span className="flex items-center gap-2">
                          <HugeiconsIcon icon={Icon} className="h-4 w-4 text-primary" />
                          {label}
                        </span>
                        <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-linear-to-br from-primary/5 via-card to-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-primary">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-emerald-600" />
                    Delivery &amp; Pickup Tracking
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data?.deliveredCount ?? 0} invoices fully settled and delivered. Track remaining pending orders and send instant WhatsApp notifications to customers.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
