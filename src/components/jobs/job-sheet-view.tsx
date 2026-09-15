"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { JobFormDialog } from "@/components/jobs/job-form-dialog";
import { jobBalance, jobProfit } from "@/components/jobs/job-labels";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { deleteJobEntry, fetchJobEntries, saveJobEntry } from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { JOB_CUSTOMER_TYPES, JOB_PAYMENT_MODES, JOB_STATUSES } from "@/lib/validations/job";
import type { JobEntry, JobStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const PANEL =
  "rounded-[14px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

const PILL_BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

const STATUS_TONE: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "In Production": "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  Ready: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  Cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Delivered: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
};

/** Rows written before this screen existed may carry a status not in our list — keep it selectable. */
const statusOptions = (current: string) =>
  JOB_STATUSES.includes(current as JobStatus) ? [...JOB_STATUSES] : [current, ...JOB_STATUSES];

const CSV_COLUMNS: [string, (j: JobEntry) => string | number | null][] = [
  ["Job ID", (j) => j.job_number],
  ["Date", (j) => j.date],
  ["Customer", (j) => j.customer_name],
  ["Mobile", (j) => j.mobile],
  ["Product", (j) => j.product_name],
  ["Size", (j) => j.size],
  ["Qty", (j) => j.qty],
  ["Total Sale", (j) => j.total_sale],
  ["Advance Paid", (j) => j.advance_paid],
  ["Balance", (j) => jobBalance(j)],
  ["Status", (j) => j.status],
  ["Customer Type", (j) => j.customer_type],
  ["Primary Staff", (j) => j.primary_staff],
  ["Payment Mode", (j) => j.payment_mode],
  ["Delivery Date", (j) => j.delivery_date],
  ["Actual Delivery", (j) => j.actual_delivery_date],
  ["Direct Cost", (j) => j.direct_cost],
  ["Gross Profit", (j) => jobProfit(j)],
];

function toCsv(rows: JobEntry[]): string {
  const escape = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = CSV_COLUMNS.map(([label]) => escape(label)).join(",");
  const body = rows.map((row) => CSV_COLUMNS.map(([, pick]) => escape(pick(row))).join(","));
  return [head, ...body].join("\n");
}

function downloadCsv(rows: JobEntry[]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `job-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ALL = "all";

interface KpiProps {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "indigo" | "emerald" | "amber";
}

function Kpi({ label, value, hint, tone = "default" }: KpiProps) {
  const highlight = tone === "amber";
  return (
    <div
      className={cn(
        PANEL,
        "p-5",
        highlight && "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20",
      )}
    >
      <p
        className={cn(
          "text-xs font-medium",
          highlight ? "text-amber-800 dark:text-amber-300" : "text-slate-600 dark:text-slate-300",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight",
          tone === "indigo" && "text-indigo-600 dark:text-indigo-400",
          tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
          tone === "amber" && "text-amber-700 dark:text-amber-300",
          tone === "default" && "text-slate-900 dark:text-slate-50",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1.5 text-xs",
          highlight ? "text-amber-700/80 dark:text-amber-400/80" : "text-slate-500 dark:text-slate-400",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

export function JobSheetView() {
  const { data, loading, refresh, setData } = useAsyncData(fetchJobEntries, [], {
    errorMessage: "Could not load job sheet",
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [customerType, setCustomerType] = useState<string>(ALL);
  const [paymentMode, setPaymentMode] = useState<string>(ALL);
  const [pendingOnly, setPendingOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JobEntry | null>(null);
  const [deleting, setDeleting] = useState<JobEntry | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((job) => {
      if (status !== ALL && job.status !== status) return false;
      if (customerType !== ALL && job.customer_type !== customerType) return false;
      if (paymentMode !== ALL && job.payment_mode !== paymentMode) return false;
      if (pendingOnly && jobBalance(job) <= 0) return false;
      if (!q) return true;
      return [job.job_number, job.customer_name, job.mobile, job.product_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, status, customerType, paymentMode, pendingOnly]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, job) => {
          acc.qty += Number(job.qty);
          acc.sale += Number(job.total_sale);
          acc.advance += Number(job.advance_paid);
          acc.balance += jobBalance(job);
          acc.cost += Number(job.direct_cost);
          acc.profit += jobProfit(job);
          return acc;
        },
        { qty: 0, sale: 0, advance: 0, balance: 0, cost: 0, profit: 0 },
      ),
    [rows],
  );

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(job: JobEntry) {
    setEditing(job);
    setFormOpen(true);
  }

  /** Status is the one field that changes many times a day, so it edits in place. */
  async function changeStatus(job: JobEntry, next: JobStatus) {
    if (next === job.status) return;
    setData((prev) => prev?.map((j) => (j.id === job.id ? { ...j, status: next } : j)) ?? prev);
    try {
      await saveJobEntry({ status: next }, job.id);
    } catch (err) {
      setData((prev) => prev?.map((j) => (j.id === job.id ? job : j)) ?? prev);
      toast.error("Could not update status", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJobEntry(deleting.id);
      toast.success(`${deleting.job_number} deleted`);
      await refresh();
    } catch (err) {
      toast.error("Could not delete job", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(null);
    }
  }

  const money = "whitespace-nowrap text-right tabular-nums";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Daily Job Sheet
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Record daily work, track production status, advance payments, direct costs and gross profit.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button type="button" className={PILL_BUTTON} onClick={() => window.print()}>
            <Printer className="size-4 text-slate-400" />
            Print Sheet
          </button>
          <button
            type="button"
            className={PILL_BUTTON}
            onClick={() => downloadCsv(rows)}
            disabled={!rows.length}
          >
            <Download className="size-4 text-slate-400" />
            Export CSV
          </button>
          <Button onClick={openNew} className="h-10 rounded-[10px] px-4 text-sm font-medium shadow-none">
            <Plus className="size-4" />
            New Job Entry
          </Button>
        </div>
      </div>

      {/* KPIs — reflect the filtered rows, so "Pending Only" narrows the totals too */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Total Jobs" value={String(rows.length)} hint="Recorded orders" />
        <Kpi label="Total Sales" value={formatCurrency(totals.sale)} hint="Revenue generated" tone="indigo" />
        <Kpi label="Advance Paid" value={formatCurrency(totals.advance)} hint="Cash/UPI collected" tone="emerald" />
        <Kpi label="Pending Balance" value={formatCurrency(totals.balance)} hint="Outstanding due" tone="amber" />
        <Kpi
          label="Gross Profit"
          value={formatCurrency(totals.profit)}
          hint={`Cost: ${formatCurrency(totals.cost)}`}
          tone="emerald"
        />
      </div>

      {/* Filters */}
      <div className={cn(PANEL, "no-print flex flex-col gap-3 p-4 lg:flex-row lg:items-center")}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Job ID, Customer, Mobile, Product…"
            className="h-10 rounded-[10px] pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-full rounded-[10px] sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={customerType} onValueChange={setCustomerType}>
            <SelectTrigger className="h-10 w-full rounded-[10px] sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              {JOB_CUSTOMER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger className="h-10 w-full rounded-[10px] sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Modes</SelectItem>
              {JOB_PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            aria-pressed={pendingOnly}
            onClick={() => setPendingOnly((v) => !v)}
            className={cn(
              PILL_BUTTON,
              "justify-center",
              pendingOnly &&
                "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
            )}
          >
            <Filter className="size-4" />
            Pending Only
          </button>
        </div>
      </div>

      {/* Sheet */}
      <div className={cn(PANEL, "overflow-hidden")}>
        {loading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : !rows.length ? (
          <EmptyState
            icon={ClipboardList}
            title={data?.length ? "No jobs match these filters" : "No jobs recorded yet"}
            description={
              data?.length
                ? "Clear the search or filters to see the full sheet."
                : "Add today's first job to start tracking sales, advances and profit."
            }
            action={
              data?.length ? null : (
                <Button onClick={openNew} size="sm" className="rounded-[10px]">
                  New Job Entry
                </Button>
              )
            }
          />
        ) : (
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="[&>th]:h-11 [&>th]:whitespace-nowrap [&>th]:bg-slate-50 [&>th]:px-2.5 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-slate-500 dark:[&>th]:bg-slate-800/60 dark:[&>th]:text-slate-400">
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sale</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Staff · Payment</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="no-print w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr]:border-b [&>tr]:border-slate-100 [&>tr>td]:px-2.5 [&>tr>td]:py-3 [&>tr>td]:align-top dark:[&>tr]:border-slate-800">
              {rows.map((job) => {
                const balance = jobBalance(job);
                const due = balance > 0;
                const cost = Number(job.direct_cost);
                return (
                  <TableRow key={job.id} className="even:bg-transparent">
                    {/* Job */}
                    <TableCell className="whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{job.job_number}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(job.date)}</p>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <p className="max-w-[10rem] truncate font-medium text-slate-900 dark:text-slate-100">{job.customer_name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[10px] font-medium",
                            job.customer_type === "Repeat"
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
                          )}
                        >
                          {job.customer_type ?? "New"}
                        </span>
                        <span className="font-mono">{job.mobile || "No mobile"}</span>
                      </p>
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <p className="line-clamp-2 max-w-[12rem] text-slate-800 dark:text-slate-200">{job.product_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {job.size ? `${job.size} · ` : ""}
                        {formatNumber(job.qty, 0)} pcs
                      </p>
                    </TableCell>

                    {/* Sale */}
                    <TableCell className={money}>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(job.total_sale)}</p>
                      <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(job.advance_paid)} paid
                      </p>
                    </TableCell>

                    {/* Balance */}
                    <TableCell className={money}>
                      {due ? (
                        <span className="inline-flex rounded-[8px] bg-amber-50 px-2 py-1 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {formatCurrency(balance)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-[8px] bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Settled
                        </span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Select value={job.status} onValueChange={(v) => void changeStatus(job, v as JobStatus)}>
                        <SelectTrigger
                          aria-label={`Status for ${job.job_number}`}
                          className={cn(
                            "h-8 w-[8rem] rounded-[8px] border-transparent text-xs font-medium",
                            STATUS_TONE[job.status] ?? STATUS_TONE.Pending,
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions(job.status).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Staff · Payment */}
                    <TableCell>
                      <p className="max-w-[7rem] truncate text-slate-800 dark:text-slate-200" title={job.primary_staff ?? undefined}>
                        {job.primary_staff || "Unassigned"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{job.payment_mode ?? "—"}</p>
                    </TableCell>

                    {/* Delivery */}
                    <TableCell>
                      <p className="whitespace-nowrap text-slate-800 dark:text-slate-200">
                        {job.delivery_date ? formatDate(job.delivery_date) : "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {job.actual_delivery_date ? `Delivered ${formatDate(job.actual_delivery_date)}` : "Not delivered"}
                      </p>
                    </TableCell>

                    {/* Profit */}
                    <TableCell className={money}>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(jobProfit(job))}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{cost > 0 ? `${formatCurrency(cost)} cost` : "No cost"}</p>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="no-print">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-[8px] text-slate-500 hover:text-slate-900"
                            aria-label={`Actions for ${job.job_number}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-[10px]">
                          <DropdownMenuItem onSelect={() => openEdit(job)}>
                            <Pencil className="mr-2 size-4 text-slate-500" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setDeleting(job)}>
                            <Trash2 className="mr-2 size-4 text-rose-500" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Totals for whatever is currently on the sheet */}
              <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/60 [&>td]:!py-3.5">
                <TableCell colSpan={3} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Totals — {rows.length} {rows.length === 1 ? "job" : "jobs"}, {formatNumber(totals.qty, 0)} pcs
                </TableCell>
                <TableCell className={money}>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totals.sale)}</p>
                  <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.advance)} paid</p>
                </TableCell>
                <TableCell className={cn(money, "font-semibold text-amber-800 dark:text-amber-300")}>
                  {formatCurrency(totals.balance)}
                </TableCell>
                <TableCell colSpan={3} />
                <TableCell className={money}>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.profit)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatCurrency(totals.cost)} cost</p>
                </TableCell>
                <TableCell className="no-print" />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>

      <JobFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        job={editing}
        onSaved={() => void refresh()}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete job?"
        description={`${deleting?.job_number ?? "This job"} for ${deleting?.customer_name ?? "the customer"} will be removed permanently.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
