"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Clock,
  FileText,
  History,
  IndianRupee,
  Package,
  Receipt,
  Users,
  Wallet,
  Ruler,
  Zap,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DateFilter } from "@/components/dashboard/date-filter";
import { LowStockPanel } from "@/components/dashboard/low-stock-panel";
import { CardGridSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SwapMeasurementCard } from "@/components/ui/swap-measurement-card";
import { DataList } from "@/components/shared/data-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchDashboard } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/calculator", label: "Price Calculator", icon: Calculator },
  { href: "/quotations/new", label: "New Quotation", icon: Plus },
  { href: "/customers", label: "Add Customer", icon: Users },
  { href: "/products", label: "Rate Slabs & Products", icon: Package },
  { href: "/quotations?status=invoice", label: "View Invoices", icon: Receipt },
];

/** Same frame as <Card>: 12px radius, hairline border, near-flat. */
const PANEL = "rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]";

function PanelHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
          <Icon className="size-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-5 text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function DashboardView() {
  const [converterOpen, setConverterOpen] = useState(false);
  const { data, loading, error, refresh } = useAsyncData(fetchDashboard, [], {
    errorMessage: "Could not load dashboard",
  });

  // Meter fills for the KPI strip — each is a real share, never a placeholder.
  const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
  const bestMonth = Math.max(
    0,
    ...Object.values(
      (data?.activity ?? []).reduce<Record<string, number>>((acc, day) => {
        const month = day.date.slice(0, 7);
        acc[month] = (acc[month] ?? 0) + day.total;
        return acc;
      }, {}),
    ),
  );
  const pendingOrders = data?.pendingOrdersCount ?? 0;
  const deliveredOrders = data?.deliveredCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sales, pending payments and recent billing at a glance."
      >
        <div className="inline-flex rounded-lg shadow-[var(--shadow-raised)] [&>*]:shadow-none [&>*:first-child]:rounded-r-none [&>*:last-child]:-ml-px [&>*:last-child]:rounded-l-none">
        <Dialog open={converterOpen} onOpenChange={setConverterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" title="Unit converter">
              <Ruler className="text-muted-foreground" />
              <span className="hidden sm:inline">Converter</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Measurement converter</DialogTitle>
              <DialogDescription>
                Convert between CM, Inches, and Feet. Tap copy to grab the result.
              </DialogDescription>
            </DialogHeader>
            <SwapMeasurementCard />
          </DialogContent>
        </Dialog>
        <DateFilter />
        </div>
      </PageHeader>

      {loading ? (
        <CardGridSkeleton />
      ) : error ? (
        <Card className={PANEL}>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <LowStockPanel />

          {/* KPI strip — one frame, cells separated by hairlines */}
          <div
            className={cn(
              PANEL,
              "flex flex-wrap gap-px overflow-hidden bg-border",
              "[&>*]:min-w-[9.5rem] [&>*]:flex-1 [&>*]:basis-[9.5rem] [&>*]:bg-card sm:[&>*]:basis-[11rem]",
            )}
          >
            <StatCard
              bare
              label="Today's Sales"
              value={formatCurrency(data?.todaySales ?? 0)}
              fill={share(data?.todaySales ?? 0, data?.monthlySales ?? 0)}
              icon={TrendingUp}
              tone="default"
            />
            <StatCard
              bare
              label="Monthly Revenue"
              value={formatCurrency(data?.monthlySales ?? 0)}
              fill={share(data?.monthlySales ?? 0, bestMonth)}
              icon={IndianRupee}
              tone="info"
            />
            <StatCard
              bare
              label="Pending Payments"
              value={formatCurrency(data?.pendingAmount ?? 0)}
              fill={share(data?.pendingAmount ?? 0, data?.totalSales ?? 0)}
              icon={Wallet}
              tone="danger"
            />
            <StatCard
              bare
              label="Pending Orders"
              value={String(pendingOrders)}
              fill={share(pendingOrders, pendingOrders + deliveredOrders)}
              icon={Clock}
              tone="warning"
            />
            <StatCard
              bare
              label="Active Customers"
              value={String(data?.customerCount ?? 0)}
              icon={Users}
              tone="success"
            />
          </div>

          {/* Billing activity + quick actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <div className={cn(PANEL, "h-full min-w-0")}>
                <PanelHeader
                  icon={BarChart3}
                  title="Revenue"
                  description="Invoiced per day"
                  className="border-b border-border"
                />
                <div className="p-4">
                  <RevenueChart activity={data?.activity ?? []} />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className={cn(PANEL, "flex h-full flex-col")}>
                <PanelHeader
                  icon={Zap}
                  title="Quick Actions"
                  description="Fast shortcuts for daily operations"
                  className="border-b border-border"
                />
                {/* Dividers live on the wrappers so the rounded hover never bends them. */}
                <nav aria-label="Quick actions" className="flex flex-1 flex-col divide-y divide-border px-2 py-1">
                  {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                    <div key={href} className="flex flex-1 flex-col py-1">
                      <Link
                        href={href}
                        className="group flex min-h-11 flex-1 items-center gap-3 rounded-lg px-3 text-sm text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary" strokeWidth={1.75} />
                        <span className="flex-1 truncate">{label}</span>
                        <ArrowUpRight className="size-3.5 text-muted-foreground/60 transition-[color,translate] duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Recent billing */}
          <div className={cn(PANEL, "overflow-hidden")}>
            <PanelHeader
              icon={History}
              title="Recent Billing Activities"
              description="Latest quotations, invoices, and customer transactions"
              className="border-b border-border"
            >
              <Button asChild variant="outline" size="sm" className="pr-2.5">
                <Link href="/quotations">
                  View all <ArrowRight className="text-muted-foreground" />
                </Link>
              </Button>
            </PanelHeader>

            {!data?.recent.length ? (
              <EmptyState
                icon={FileText}
                title="No quotations created yet"
                description="Create your first quotation or invoice to see it here."
                action={
                  <Button asChild size="sm" className="rounded-lg">
                    <Link href="/quotations/new">New Quotation</Link>
                  </Button>
                }
              />
            ) : (
              <div>
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
                        <Link href={`/quotations/${q.id}`} className="font-medium text-foreground hover:text-primary">
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
                      className: "whitespace-nowrap text-muted-foreground",
                      cell: (q) => formatDate(q.date),
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
                      className: "whitespace-nowrap font-medium tabular-nums text-foreground",
                      cell: (q) => formatCurrency(q.grand_total),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
