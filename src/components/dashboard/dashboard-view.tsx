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
  IndianRupee,
  Package,
  Receipt,
  Users,
  Wallet,
  Ruler,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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

const QUICK_ACTIONS = [
  { href: "/calculator", label: "Price Calculator", icon: Calculator },
  { href: "/quotations/new", label: "New Quotation", icon: Plus },
  { href: "/customers", label: "Add Customer", icon: Users },
  { href: "/products", label: "Rate Slabs & Products", icon: Package },
  { href: "/quotations?status=invoice", label: "View Invoices", icon: Receipt },
];

const MOCK_REVENUE_CHART = [
  { month: "Jan", revenue: 45000, orders: 18 },
  { month: "Feb", revenue: 52000, orders: 22 },
  { month: "Mar", revenue: 48000, orders: 20 },
  { month: "Apr", revenue: 61000, orders: 28 },
  { month: "May", revenue: 55000, orders: 25 },
  { month: "Jun", revenue: 72000, orders: 34 },
  { month: "Jul", revenue: 84000, orders: 40 },
];

export function DashboardView() {
  const [converterOpen, setConverterOpen] = useState(false);
  const { data, loading, error, refresh } = useAsyncData(fetchDashboard, [], {
    errorMessage: "Could not load dashboard",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Sales metrics, quotation tracking, and billing analytics."
      >
        <div className="flex items-center gap-2">
          <Dialog open={converterOpen} onOpenChange={setConverterOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800"
              >
                <Ruler className="size-3.5 text-indigo-500" />
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
      </PageHeader>

      {loading ? (
        <CardGridSkeleton />
      ) : error ? (
        <Card className="rounded-[5px] border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-slate-500">{error}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Top Key Performance Indicator Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Today's Sales"
              value={formatCurrency(data?.todaySales ?? 0)}
              hint="Invoices raised today"
              change="+14.2%"
              trend="up"
              sparklineData={[10, 15, 20, 28, 35, 42, 50]}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              label="Monthly Revenue"
              value={formatCurrency(data?.monthlySales ?? 0)}
              hint="Current month total"
              change="+18.5%"
              trend="up"
              sparklineData={[25, 30, 45, 40, 60, 75, 84]}
              icon={IndianRupee}
              tone="success"
            />
            <StatCard
              label="Pending Payments"
              value={formatCurrency(data?.pendingAmount ?? 0)}
              hint="Outstanding balance"
              change="-4.1%"
              trend="down"
              sparklineData={[50, 45, 40, 35, 30, 25, 20]}
              icon={Wallet}
              tone="warning"
            />
            <StatCard
              label="Pending Orders"
              value={String(data?.pendingOrdersCount ?? 0)}
              hint={`${data?.deliveredCount ?? 0} orders delivered`}
              change="+5%"
              trend="up"
              sparklineData={[5, 8, 12, 10, 15, 14, 18]}
              icon={Clock}
              tone="default"
            />
            <StatCard
              label="Active Customers"
              value={String(data?.customerCount ?? 0)}
              hint="Client directory"
              change="+12%"
              trend="up"
              sparklineData={[100, 110, 115, 120, 125, 130, 140]}
              icon={Users}
              tone="default"
            />
          </div>

          {/* Revenue Chart + Activity Overview */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Bar Chart */}
            <div className="rounded-[5px] border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Revenue &amp; Sales Trends
                  </h3>
                  <p className="text-xs text-slate-500">Monthly billing performance over recent periods</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <span className="size-2 rounded-full bg-indigo-600 dark:bg-indigo-400" /> Revenue
                  </span>
                </div>
              </div>

              <div className="mt-6 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_REVENUE_CHART} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(79, 70, 229, 0.06)", radius: 5 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-[5px] border border-slate-700 bg-slate-900 p-3 text-white shadow-xl">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{data.month}</p>
                              <p className="mt-1 text-base font-extrabold text-white">
                                {formatCurrency(data.revenue)}
                              </p>
                              <p className="mt-0.5 text-xs text-indigo-300 font-medium">
                                {data.orders} orders processed
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                      barSize={38}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions & Business Tools Panel */}
            <div className="space-y-4">
              <div className="rounded-[5px] border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Quick Actions
                </h3>
                <p className="text-xs text-slate-500 mb-4">Fast shortcuts for daily operations</p>
                <div className="space-y-2">
                  {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                    <Button
                      key={href}
                      asChild
                      variant="outline"
                      className="w-full justify-between rounded-[5px] border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                    >
                      <Link href={href}>
                        <span className="flex items-center gap-2.5">
                          <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />
                          {label}
                        </span>
                        <ArrowUpRight className="size-3.5 opacity-60" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-[5px] border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 dark:border-indigo-950/50 dark:from-indigo-950/20 dark:to-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Order &amp; Delivery Tracking
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {data?.deliveredCount ?? 0} orders completed and delivered. Automated customer WhatsApp notifications enabled.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Billing Activities Section */}
          <div className="rounded-[5px] border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Recent Billing Activities
                </h3>
                <p className="text-xs text-slate-500">Latest quotations, invoices, and customer transactions</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-[5px] text-xs font-semibold">
                <Link href="/quotations">
                  View All <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>

            {!data?.recent.length ? (
              <EmptyState
                icon={FileText}
                title="No quotations created yet"
                description="Create your first quotation or invoice to see it here."
                action={
                  <Button asChild size="sm" className="rounded-[5px]">
                    <Link href="/quotations/new">New Quotation</Link>
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
                    className: "whitespace-nowrap font-bold",
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
                    className: "max-w-[14rem] truncate font-semibold",
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
                    className: "whitespace-nowrap font-bold text-slate-900 dark:text-slate-100",
                    cell: (q) => formatCurrency(q.grand_total),
                  },
                ]}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
