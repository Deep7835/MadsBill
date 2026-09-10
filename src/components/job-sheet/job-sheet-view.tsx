"use client";

import { useCallback, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Download01Icon,
  PrinterIcon,
  Search01Icon,
  FilterIcon,
  Task01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncData } from "@/hooks/use-async-data";
import { deleteJobSheetEntry, fetchJobSheetEntries, updateJobSheetEntry } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JobSheetEntry, JobSheetStatus } from "@/lib/types/database";
import { JobEntryDialog } from "./job-entry-dialog";

export function JobSheetView() {
  const fetcher = useCallback(() => fetchJobSheetEntries(), []);
  const { data: entries, loading, error, refresh } = useAsyncData(fetcher, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JobSheetEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");
  const [balanceOnly, setBalanceOnly] = useState(false);

  // Filtered rows
  const filtered = (entries ?? []).filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.job_number.toLowerCase().includes(q) ||
      e.customer_name.toLowerCase().includes(q) ||
      e.product_name.toLowerCase().includes(q) ||
      (e.mobile && e.mobile.includes(q)) ||
      (e.primary_staff && e.primary_staff.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesType = customerTypeFilter === "all" || e.customer_type === customerTypeFilter;
    const matchesMode = paymentModeFilter === "all" || e.payment_mode === paymentModeFilter;
    
    const balance = Math.max(0, Number(e.total_sale || 0) - Number(e.advance_paid || 0));
    const matchesBalance = !balanceOnly || balance > 0;

    return matchesSearch && matchesStatus && matchesType && matchesMode && matchesBalance;
  });

  // Calculate Summary KPIs
  const totalJobs = filtered.length;
  const totalSales = filtered.reduce((s, e) => s + Number(e.total_sale || 0), 0);
  const totalAdvance = filtered.reduce((s, e) => s + Number(e.advance_paid || 0), 0);
  const totalBalance = filtered.reduce(
    (s, e) => s + Math.max(0, Number(e.total_sale || 0) - Number(e.advance_paid || 0)),
    0
  );
  const totalDirectCost = filtered.reduce((s, e) => s + Number(e.direct_cost || 0), 0);
  const totalGrossProfit = totalSales - totalDirectCost;

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteJobSheetEntry(deletingId);
      toast.success("Job entry deleted");
      await refresh();
    } catch (err) {
      toast.error("Could not delete job entry", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleQuickStatusChange(id: string, newStatus: JobSheetStatus) {
    try {
      await updateJobSheetEntry(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      await refresh();
    } catch (err) {
      toast.error("Could not update status", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function handleExportCSV() {
    if (filtered.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Job ID",
      "Date",
      "Customer",
      "Mobile",
      "Product",
      "Size",
      "Qty",
      "Total Sale",
      "Advance Paid",
      "Balance",
      "Status",
      "Customer Type",
      "Primary Staff",
      "Payment Mode",
      "Delivery Date",
      "Actual Delivery",
      "Direct Cost",
      "Gross Profit",
    ];

    const rows = filtered.map((e) => {
      const balance = Math.max(0, Number(e.total_sale || 0) - Number(e.advance_paid || 0));
      const profit = Number(e.total_sale || 0) - Number(e.direct_cost || 0);

      return [
        `"${e.job_number}"`,
        `"${e.date}"`,
        `"${e.customer_name}"`,
        `"${e.mobile || ""}"`,
        `"${e.product_name}"`,
        `"${e.size || ""}"`,
        e.qty,
        e.total_sale,
        e.advance_paid,
        balance,
        `"${e.status}"`,
        `"${e.customer_type || ""}"`,
        `"${e.primary_staff || ""}"`,
        `"${e.payment_mode || ""}"`,
        `"${e.delivery_date || ""}"`,
        `"${e.actual_delivery_date || ""}"`,
        e.direct_cost,
        profit,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Daily_Job_Sheet_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Job Sheet exported to CSV");
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Daily Job Sheet"
          description="Record daily work data, track production status, advance payments, direct costs, and gross profit."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-9"
            >
              <HugeiconsIcon icon={PrinterIcon} className="h-4 w-4 mr-1.5" />
              Print Sheet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9"
            >
              <HugeiconsIcon icon={Download01Icon} className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingEntry(null);
                setDialogOpen(true);
              }}
              className="h-9"
            >
              <HugeiconsIcon icon={Add01Icon} className="h-4 w-4 mr-1.5" />
              New Job Entry
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* KPI Cards */}
      <div className="no-print grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Jobs</div>
            <div className="text-2xl font-bold mt-1">{totalJobs}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Recorded orders</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalSales)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Revenue generated</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Advance Paid</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalAdvance)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Cash/UPI collected</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 font-semibold">
              Pending Balance
            </div>
            <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-400">
              {formatCurrency(totalBalance)}
            </div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Outstanding due</div>
          </CardContent>
        </Card>

        <Card className="bg-card col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Gross Profit</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalGrossProfit)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Cost: {formatCurrency(totalDirectCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="no-print mb-6">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 min-w-[220px]">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search Job ID, Customer, Mobile, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="In Production">In Production</SelectItem>
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Repeat">Repeat</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Credit">Credit</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={balanceOnly ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs"
              onClick={() => setBalanceOnly(!balanceOnly)}
            >
              <HugeiconsIcon icon={FilterIcon} className="h-3.5 w-3.5 mr-1" />
              {balanceOnly ? "Showing Pending" : "Pending Only"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Job Sheet Spreadsheet Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <HugeiconsIcon icon={Task01Icon} className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-semibold">No job entries found</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {search || statusFilter !== "all" || balanceOnly
                ? "Try adjusting your search or filters to see job sheet records."
                : "Start recording your daily print production, sales, advances, and profits."}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingEntry(null);
                setDialogOpen(true);
              }}
            >
              <HugeiconsIcon icon={Add01Icon} className="h-4 w-4 mr-1.5" />
              Create First Job Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            {/* Header matching Excel style in screenshot */}
            <thead>
              <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                <th className="py-3 px-3 w-24">Job ID</th>
                <th className="py-3 px-3 w-28">Date</th>
                <th className="py-3 px-3 w-36">Customer</th>
                <th className="py-3 px-3 w-28">Mobile</th>
                <th className="py-3 px-3 w-32">Product</th>
                <th className="py-3 px-3 w-16 text-center">Size</th>
                <th className="py-3 px-3 w-16 text-right">Qty</th>
                <th className="py-3 px-3 w-24 text-right">Total Sale</th>
                <th className="py-3 px-3 w-24 text-right">Advance Paid</th>
                <th className="py-3 px-3 w-24 text-right bg-amber-950/60 text-amber-200">Balance</th>
                <th className="py-3 px-3 w-32">Status</th>
                <th className="py-3 px-3 w-24">Customer Type</th>
                <th className="py-3 px-3 w-24">Primary Staff</th>
                <th className="py-3 px-3 w-24">Payment Mode</th>
                <th className="py-3 px-3 w-28">Delivery Date</th>
                <th className="py-3 px-3 w-28">Actual Delivery</th>
                <th className="py-3 px-3 w-24 text-right">Direct Cost</th>
                <th className="py-3 px-3 w-24 text-right">Gross Profit</th>
                <th className="py-3 px-2 w-16 text-center no-print">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((e, idx) => {
                const balance = Math.max(0, Number(e.total_sale || 0) - Number(e.advance_paid || 0));
                const profit = Number(e.total_sale || 0) - Number(e.direct_cost || 0);

                return (
                  <tr
                    key={e.id || idx}
                    className={`hover:bg-muted/40 transition-colors divide-x divide-border/60 ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                    }`}
                  >
                    {/* Job ID */}
                    <td className="py-2.5 px-3 font-semibold text-primary font-mono whitespace-nowrap">
                      {e.job_number}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                      {e.date ? formatDate(e.date) : "—"}
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3 font-medium text-foreground max-w-[150px] truncate">
                      {e.customer_name}
                    </td>

                    {/* Mobile */}
                    <td className="py-2.5 px-3 text-muted-foreground font-mono whitespace-nowrap">
                      {e.mobile || "—"}
                    </td>

                    {/* Product */}
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {e.product_name}
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-3 text-center text-muted-foreground">
                      {e.size || "—"}
                    </td>

                    {/* Qty */}
                    <td className="py-2.5 px-3 text-right font-medium">
                      {e.qty}
                    </td>

                    {/* Total Sale */}
                    <td className="py-2.5 px-3 text-right font-medium">
                      {formatCurrency(e.total_sale)}
                    </td>

                    {/* Advance Paid */}
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(e.advance_paid)}
                    </td>

                    {/* Balance (Warm amber highlight when > 0, matching screenshot) */}
                    <td
                      className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                        balance > 0
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatCurrency(balance)}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2">
                      <Select
                        value={e.status}
                        onValueChange={(v) => handleQuickStatusChange(e.id, v as JobSheetStatus)}
                      >
                        <SelectTrigger
                          className={`h-7 text-[11px] px-2 py-0 border-none font-medium rounded-full ${
                            e.status === "Completed"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : e.status === "Ready"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : e.status === "In Production"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In Production">In Production</SelectItem>
                          <SelectItem value="Ready">Ready</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Customer Type */}
                    <td className="py-2.5 px-3">
                      {e.customer_type ? (
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            e.customer_type === "New"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                              : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                          }`}
                        >
                          {e.customer_type}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Primary Staff */}
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {e.primary_staff || "—"}
                    </td>

                    {/* Payment Mode */}
                    <td className="py-2.5 px-3 font-medium">
                      {e.payment_mode || "—"}
                    </td>

                    {/* Delivery Date */}
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {e.delivery_date ? formatDate(e.delivery_date) : "—"}
                    </td>

                    {/* Actual Delivery */}
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {e.actual_delivery_date ? formatDate(e.actual_delivery_date) : "—"}
                    </td>

                    {/* Direct Cost */}
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {e.direct_cost ? formatCurrency(e.direct_cost) : "—"}
                    </td>

                    {/* Gross Profit */}
                    <td
                      className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap ${
                        profit >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {formatCurrency(profit)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-2 px-2 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingEntry(e);
                            setDialogOpen(true);
                          }}
                        >
                          <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingId(e.id)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Summary Row matching Excel sheet totals */}
            <tfoot>
              <tr className="bg-muted/80 font-bold border-t-2 border-border divide-x divide-border">
                <td colSpan={6} className="py-3 px-3 text-right">
                  TOTALS ({filtered.length} Jobs)
                </td>
                <td className="py-3 px-3 text-right">{filtered.reduce((s, e) => s + Number(e.qty || 0), 0)}</td>
                <td className="py-3 px-3 text-right text-primary">{formatCurrency(totalSales)}</td>
                <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalAdvance)}
                </td>
                <td className="py-3 px-3 text-right text-amber-700 dark:text-amber-400 bg-amber-500/10">
                  {formatCurrency(totalBalance)}
                </td>
                <td colSpan={6}></td>
                <td className="py-3 px-3 text-right text-muted-foreground">{formatCurrency(totalDirectCost)}</td>
                <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalGrossProfit)}
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Entry Dialog */}
      <JobEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entryToEdit={editingEntry}
        onSaved={refresh}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(op) => {
          if (!op) setDeletingId(null);
        }}
        title="Delete Job Entry?"
        description="This job sheet record will be permanently deleted."
        confirmLabel="Delete Entry"
        onConfirm={handleDelete}
      />
    </>
  );
}
