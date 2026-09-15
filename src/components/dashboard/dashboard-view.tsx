"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
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
import { CardGridSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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

/** One card frame for every dashboard panel: soft radius, hairline border, no shadow. */
const PANEL =
  "rounded-[14px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

const PILL_BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

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
    <div className={cn("flex items-center justify-between gap-3 px-5 py-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          {description ? (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
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
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Dashboard overview
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Sales metrics, quotation tracking, and billing analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={converterOpen} onOpenChange={setConverterOpen}>
            <DialogTrigger asChild>
              <button type="button" className={PILL_BUTTON}>
                <Ruler className="size-4 text-slate-400" />
                Unit Converter
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Ruler className="size-5 text-indigo-600 dark:text-indigo-400" />
                  Measurement Converter
                </DialogTitle>
                <DialogDescription>
                  Convert between CM, Inches, and Feet. Tap copy to grab the result.
                </DialogDescription>
              </DialogHeader>
              <SwapMeasurementCard />
            </DialogContent>
          </Dialog>
          <DateFilter />
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : error ? (
        <Card className={PANEL}>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-slate-500">{error}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* KPI strip — one frame, cells separated by hairlines */}
          <div
            className={cn(
              PANEL,
              "grid overflow-hidden sm:grid-cols-2 lg:grid-cols-5",
              "[&>*]:border-slate-200 dark:[&>*]:border-slate-800",
              "[&>*+*]:border-t sm:[&>*:nth-child(2)]:border-t-0 sm:[&>*:nth-child(even)]:border-l",
              "lg:[&>*]:border-t-0 lg:[&>*+*]:border-l",
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
          <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
            <div className="min-w-0 space-y-5 lg:col-span-2">
              <div className={cn(PANEL, "min-w-0")}>
                <PanelHeader
                  icon={BarChart3}
                  title="Revenue"
                  description="Invoiced per day"
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="size-2 rounded-full bg-indigo-500" /> Revenue
                  </span>
                </PanelHeader>
                <div className="p-5">
                  <RevenueChart activity={data?.activity ?? []} />
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <div className={PANEL}>
                <PanelHeader
                  icon={Zap}
                  title="Quick Actions"
                  description="Fast shortcuts for daily operations"
                  className="border-b border-slate-100 dark:border-slate-800"
                />
                <div className="space-y-2 p-4">
                  {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex h-11 items-center justify-between rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          <Icon className="size-3.5" />
                        </span>
                        {label}
                      </span>
                      <ArrowUpRight className="size-4 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Order tracking — full width */}
          <div className={cn(PANEL, "flex items-start gap-3 p-5")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Order &amp; Delivery Tracking
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {data?.deliveredCount ?? 0} orders completed and delivered. Automated customer WhatsApp notifications enabled.
              </p>
            </div>
          </div>

          {/* Recent billing */}
          <div className={cn(PANEL, "overflow-hidden")}>
            <PanelHeader
              icon={History}
              title="Recent Billing Activities"
              description="Latest quotations, invoices, and customer transactions"
              className="border-b border-slate-100 dark:border-slate-800"
            >
              <Link href="/quotations" className={PILL_BUTTON}>
                View All <ArrowRight className="size-4 text-slate-400" />
              </Link>
            </PanelHeader>

            {!data?.recent.length ? (
              <EmptyState
                icon={FileText}
                title="No quotations created yet"
                description="Create your first quotation or invoice to see it here."
                action={
                  <Button asChild size="sm" className="rounded-[10px]">
                    <Link href="/quotations/new">New Quotation</Link>
                  </Button>
                }
              />
            ) : (
              <div className="[&_thead_tr]:bg-slate-50/80 dark:[&_thead_tr]:bg-slate-800/40">
                <DataList
                  rows={data.recent}
                  rowKey={(q) => q.id}
                  href={(q) => `/quotations/${q.id}`}
                  columns={[
                    {
                      key: "number",
                      header: "Document No.",
                      primary: true,
                      className: "whitespace-nowrap font-semibold",
                      cell: (q) => (
                        <Link href={`/quotations/${q.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                          {q.quote_number}
                        </Link>
                      ),
                    },
                    {
                      key: "customer",
                      header: "Customer",
                      subtitle: true,
                      className: "max-w-[14rem] truncate font-medium",
                      cell: (q) => q.customer?.business_name ?? "—",
                    },
                    {
                      key: "date",
                      header: "Date",
                      hideBelow: "lg",
                      className: "whitespace-nowrap text-xs text-slate-500",
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
                      className: "whitespace-nowrap font-semibold text-slate-900 dark:text-slate-100",
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
