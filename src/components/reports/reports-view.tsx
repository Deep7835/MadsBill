"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  endOfMonth,
  endOfQuarter,
  format,
  startOfMonth,
  startOfQuarter,
  subMonths,
} from "date-fns";
import { Download, FileText, Landmark, Receipt, Users, Package, ListOrdered, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { downloadReportPdf } from "@/lib/pdf/report-pdf";
import { fetchReportData } from "@/lib/queries";
import {
  buildReport,
  downloadCsv,
  toCsv,
  type CsvColumn,
  type RateSlabRow,
  type Report,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

const PANEL =
  "rounded-[14px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

const PILL_BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

const HEAD_ROW =
  "[&>th]:h-11 [&>th]:whitespace-nowrap [&>th]:bg-slate-900 [&>th]:px-3 [&>th]:normal-case [&>th]:tracking-normal [&>th]:text-white dark:[&>th]:bg-slate-950";
const BODY = "text-[13px] [&>tr>td]:px-3 [&>tr>td]:py-2.5";
const FOOT_ROW =
  "border-t border-slate-200 bg-slate-50 font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800/60";
const NUM = "whitespace-nowrap text-right tabular-nums";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/** Indian financial year runs April–March. */
function financialYear(now: Date): { from: Date; to: Date } {
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: new Date(startYear, 3, 1), to: new Date(startYear + 1, 2, 31) };
}

const PRESETS: { key: string; label: string; range: () => { from: Date; to: Date } }[] = [
  { key: "month", label: "This month", range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  {
    key: "last-month",
    label: "Last month",
    range: () => {
      const m = subMonths(new Date(), 1);
      return { from: startOfMonth(m), to: endOfMonth(m) };
    },
  },
  { key: "quarter", label: "This quarter", range: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { key: "fy", label: "This FY", range: () => financialYear(new Date()) },
];

type Tab = "overview" | "gstr1" | "gstr3b" | "register" | "products" | "customers";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: Landmark },
  { key: "gstr1", label: "GSTR-1", icon: FileText },
  { key: "gstr3b", label: "GSTR-3B", icon: Receipt },
  { key: "register", label: "Sales register", icon: ListOrdered },
  { key: "products", label: "Products", icon: Package },
  { key: "customers", label: "Customers", icon: Users },
];

const SLAB_CSV: CsvColumn<RateSlabRow>[] = [
  ["Rate %", (r) => r.rate],
  ["Invoices", (r) => r.invoices],
  ["Taxable Value", (r) => r.taxable],
  ["CGST", (r) => r.cgst],
  ["SGST", (r) => r.sgst],
  ["IGST", (r) => r.igst],
  ["Total Tax", (r) => r.tax],
];

function Stat({ label, value, tone }: { label: string; value: string; tone?: "indigo" | "emerald" | "amber" }) {
  return (
    <div className={cn(PANEL, "p-4")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate text-xl font-semibold tracking-tight",
          tone === "indigo" && "text-indigo-600 dark:text-indigo-400",
          tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
          tone === "amber" && "text-amber-700 dark:text-amber-300",
          !tone && "text-slate-900 dark:text-slate-50",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SlabTable({ rows, total }: { rows: RateSlabRow[]; total: RateSlabRow }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className={HEAD_ROW}>
          <TableHead>Rate</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Taxable Value</TableHead>
          <TableHead className="text-right">CGST</TableHead>
          <TableHead className="text-right">SGST</TableHead>
          <TableHead className="text-right">IGST</TableHead>
          <TableHead className="text-right">Total Tax</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={BODY}>
        {rows.length ? (
          rows.map((r) => (
            <TableRow key={r.rate}>
              <TableCell className="font-medium">{formatNumber(r.rate, 0)}%</TableCell>
              <TableCell className={NUM}>{r.invoices}</TableCell>
              <TableCell className={NUM}>{formatCurrency(r.taxable)}</TableCell>
              <TableCell className={NUM}>{formatCurrency(r.cgst)}</TableCell>
              <TableCell className={NUM}>{formatCurrency(r.sgst)}</TableCell>
              <TableCell className={NUM}>{formatCurrency(r.igst)}</TableCell>
              <TableCell className={cn(NUM, "font-semibold")}>{formatCurrency(r.tax)}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="py-6 text-center text-slate-500">
              No invoices in this segment for the period.
            </TableCell>
          </TableRow>
        )}
        <TableRow className={FOOT_ROW}>
          <TableCell>Total</TableCell>
          <TableCell className={NUM}>{total.invoices}</TableCell>
          <TableCell className={NUM}>{formatCurrency(total.taxable)}</TableCell>
          <TableCell className={NUM}>{formatCurrency(total.cgst)}</TableCell>
          <TableCell className={NUM}>{formatCurrency(total.sgst)}</TableCell>
          <TableCell className={NUM}>{formatCurrency(total.igst)}</TableCell>
          <TableCell className={NUM}>{formatCurrency(total.tax)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function Section({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(PANEL, "overflow-hidden")}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
          {description ? <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {onExport ? (
          <button type="button" className={cn(PILL_BUTTON, "h-9 px-3 text-xs")} onClick={onExport}>
            <Download className="size-3.5 text-slate-400" />
            CSV
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ReportsView() {
  const [from, setFrom] = useState(() => ymd(startOfMonth(new Date())));
  const [to, setTo] = useState(() => ymd(endOfMonth(new Date())));
  const [tab, setTab] = useState<Tab>("overview");
  const [exporting, setExporting] = useState(false);

  const valid = Boolean(from && to && from <= to);
  const { data, loading } = useAsyncData(
    () => (valid ? fetchReportData(from, to) : Promise.resolve(null)),
    [from, to, valid],
    { errorMessage: "Could not load report" },
  );

  const report: Report | null = useMemo(
    () => (data ? buildReport({ from, to }, data.invoices, data.payments, data.settings) : null),
    [data, from, to],
  );

  const activePreset = PRESETS.find((p) => {
    const r = p.range();
    return ymd(r.from) === from && ymd(r.to) === to;
  })?.key;

  function applyPreset(key: string) {
    const r = PRESETS.find((p) => p.key === key)!.range();
    setFrom(ymd(r.from));
    setTo(ymd(r.to));
  }

  async function exportPdf() {
    if (!report) return;
    setExporting(true);
    try {
      await downloadReportPdf(report, data?.settings ?? null);
    } catch (err) {
      toast.error("Could not build PDF", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setExporting(false);
    }
  }

  const stamp = `${from}-to-${to}`;
  const csv = <T,>(name: string, rows: T[], columns: CsvColumn<T>[]) => () =>
    downloadCsv(`${name}-${stamp}.csv`, toCsv(rows, columns));

  const t = report?.totals;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Reports &amp; GST</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Return-ready GST figures, sales register and analytics built from your tax invoices.
          </p>
        </div>
        <button type="button" className={PILL_BUTTON} onClick={() => void exportPdf()} disabled={!report || exporting}>
          <FileText className="size-4 text-slate-400" />
          {exporting ? "Building PDF…" : "Export PDF"}
        </button>
      </div>

      {/* Period */}
      <div className={cn(PANEL, "flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between")}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={activePreset === p.key}
              onClick={() => applyPreset(p.key)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors",
                activePreset === p.key
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40 rounded-[10px]" aria-label="From date" />
          <span className="text-sm text-slate-400">to</span>
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10 w-40 rounded-[10px]" aria-label="To date" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-[12px] border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-[9px] px-3.5 py-2 text-sm font-medium transition-colors",
              tab === key
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {!valid ? (
        <div className={PANEL}>
          <EmptyState icon={FileText} title="Pick a valid period" description="The start date must be on or before the end date." />
        </div>
      ) : loading || !report || !t ? (
        <div className={PANEL}>
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : !report.register.length ? (
        <div className={PANEL}>
          <EmptyState
            icon={FileText}
            title="No tax invoices in this period"
            description="Reports are built from invoices only. Convert quotations to invoices, or widen the date range."
            action={
              <Link href="/quotations" className={PILL_BUTTON}>
                Open Quotations &amp; Invoices
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {tab === "overview" ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Invoices" value={String(t.invoices)} />
                <Stat label="Taxable value" value={formatCurrency(t.taxable)} tone="indigo" />
                <Stat label="Total GST" value={formatCurrency(t.tax)} />
                <Stat label="Invoice value" value={formatCurrency(t.total)} tone="indigo" />
                <Stat label="CGST" value={formatCurrency(t.cgst)} />
                <Stat label="SGST" value={formatCurrency(t.sgst)} />
                <Stat label="Collected" value={formatCurrency(t.collected)} tone="emerald" />
                <Stat label="Outstanding" value={formatCurrency(t.outstanding)} tone="amber" />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Section title="Top products" description="By invoiced revenue">
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.products.slice(0, 5).map((p) => (
                      <li key={p.description} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <span className="truncate text-slate-700 dark:text-slate-200">{p.description}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatCurrency(p.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
                <Section title="Top customers" description="By invoiced revenue">
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.customers.slice(0, 5).map((c) => (
                      <li key={c.id ?? c.name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                          {c.outstanding > 0 ? (
                            <span className="text-xs text-amber-700 dark:text-amber-300">{formatCurrency(c.outstanding)} outstanding</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatCurrency(c.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            </div>
          ) : null}

          {tab === "gstr1" ? (
            <div className="space-y-5">
              <Section
                title="B2B — registered customers"
                description="Table 4: invoices issued to customers with a GSTIN, grouped by rate"
                onExport={csv("gstr1-b2b", report.gstr1.b2b, SLAB_CSV)}
              >
                <SlabTable rows={report.gstr1.b2b} total={report.gstr1.b2bTotal} />
              </Section>
              <Section
                title="B2C — unregistered customers"
                description="Table 7: invoices to customers without a GSTIN, grouped by rate"
                onExport={csv("gstr1-b2c", report.gstr1.b2c, SLAB_CSV)}
              >
                <SlabTable rows={report.gstr1.b2c} total={report.gstr1.b2cTotal} />
              </Section>
            </div>
          ) : null}

          {tab === "gstr3b" ? (
            <Section title="Table 3.1 — Outward supplies" description="Figures to key into the portal for this period">
              <Table>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead>Nature of supply</TableHead>
                    <TableHead className="text-right">Taxable value</TableHead>
                    <TableHead className="text-right">Integrated tax</TableHead>
                    <TableHead className="text-right">Central tax</TableHead>
                    <TableHead className="text-right">State/UT tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={BODY}>
                  <TableRow>
                    <TableCell className="font-medium">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.taxable)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.igst)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.cgst)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.sgst)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-slate-500">(b) Outward taxable supplies (zero rated)</TableCell>
                    <TableCell className={NUM}>{formatCurrency(0)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(0)}</TableCell>
                    <TableCell className={NUM}>—</TableCell>
                    <TableCell className={NUM}>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-slate-500">(c) Other outward supplies (nil rated, exempted)</TableCell>
                    <TableCell className={NUM}>{formatCurrency(0)}</TableCell>
                    <TableCell className={NUM}>—</TableCell>
                    <TableCell className={NUM}>—</TableCell>
                    <TableCell className={NUM}>—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Table 4 (eligible input tax credit) needs purchase invoices, which this app does not record yet — fill it from your purchase register.
              </p>
            </Section>
          ) : null}

          {tab === "register" ? (
            <Section
              title="Sales register"
              description={`${t.invoices} tax invoices, ${formatDate(from)} – ${formatDate(to)}`}
              onExport={csv("sales-register", report.register, [
                ["Date", (r) => r.date],
                ["Invoice", (r) => r.number],
                ["Customer", (r) => r.customer],
                ["GSTIN", (r) => r.gstin],
                ["Place of Supply", (r) => r.placeOfSupply],
                ["Segment", (r) => r.segment],
                ["Taxable Value", (r) => r.taxable],
                ["CGST", (r) => r.cgst],
                ["SGST", (r) => r.sgst],
                ["IGST", (r) => r.igst],
                ["Total Tax", (r) => r.tax],
                ["Invoice Value", (r) => r.total],
                ["Payment", (r) => r.paymentStatus],
              ])}
            >
              <Table>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Place of supply</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={BODY}>
                  {report.register.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(r.date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/quotations/${r.id}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                          {r.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate font-medium text-slate-900 dark:text-slate-100">{r.customer}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">{r.gstin ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">{r.placeOfSupply}</TableCell>
                      <TableCell className={NUM}>{formatCurrency(r.taxable)}</TableCell>
                      <TableCell className={NUM}>{formatCurrency(r.cgst)}</TableCell>
                      <TableCell className={NUM}>{formatCurrency(r.sgst)}</TableCell>
                      <TableCell className={NUM}>{formatCurrency(r.igst)}</TableCell>
                      <TableCell className={cn(NUM, "font-semibold text-slate-900 dark:text-slate-100")}>{formatCurrency(r.total)}</TableCell>
                      <TableCell><PaymentStatusBadge status={r.paymentStatus} /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={FOOT_ROW}>
                    <TableCell colSpan={5}>Totals ({t.invoices} invoices)</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.taxable)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.cgst)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.sgst)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.igst)}</TableCell>
                    <TableCell className={NUM}>{formatCurrency(t.total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </Section>
          ) : null}

          {tab === "products" ? (
            <Section
              title="Product performance"
              description="Every invoice line in the period, grouped by description"
              onExport={csv("product-performance", report.products, [
                ["Product", (r) => r.description],
                ["Invoices", (r) => r.invoices],
                ["Qty", (r) => r.qty],
                ["Area (sq.ft.)", (r) => r.area],
                ["Revenue", (r) => r.revenue],
                ["Avg Rate", (r) => r.avgRate],
              ])}
            >
              <Table>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Area (sq.ft.)</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={BODY}>
                  {report.products.map((p) => (
                    <TableRow key={p.description}>
                      <TableCell className="max-w-[20rem] truncate font-medium text-slate-900 dark:text-slate-100">{p.description}</TableCell>
                      <TableCell className={NUM}>{p.invoices}</TableCell>
                      <TableCell className={NUM}>{formatNumber(p.qty, 0)}</TableCell>
                      <TableCell className={NUM}>{p.area > 0 ? formatNumber(p.area) : "—"}</TableCell>
                      <TableCell className={cn(NUM, "font-semibold")}>{formatCurrency(p.revenue)}</TableCell>
                      <TableCell className={NUM}>
                        {formatCurrency(p.avgRate)}
                        <span className="text-xs text-slate-400"> /{p.area > 0 ? "sq.ft." : "pc"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}

          {tab === "customers" ? (
            <Section
              title="Customer analytics"
              description="Revenue, collections and outstanding per customer"
              onExport={csv("customer-analytics", report.customers, [
                ["Customer", (r) => r.name],
                ["GSTIN", (r) => r.gstin],
                ["Invoices", (r) => r.invoices],
                ["Revenue", (r) => r.revenue],
                ["Collected", (r) => r.paid],
                ["Outstanding", (r) => r.outstanding],
              ])}
            >
              <Table>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead>Customer</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={BODY}>
                  {report.customers.map((c) => (
                    <TableRow key={c.id ?? c.name}>
                      <TableCell className="max-w-[16rem] truncate font-medium">
                        {c.id ? (
                          <Link href={`/customers/${c.id}`} className="text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">{c.gstin ?? "—"}</TableCell>
                      <TableCell className={NUM}>{c.invoices}</TableCell>
                      <TableCell className={cn(NUM, "font-semibold")}>{formatCurrency(c.revenue)}</TableCell>
                      <TableCell className={cn(NUM, "text-emerald-600 dark:text-emerald-400")}>{formatCurrency(c.paid)}</TableCell>
                      <TableCell className={cn(NUM, c.outstanding > 0 && "font-semibold text-amber-700 dark:text-amber-300")}>
                        {formatCurrency(c.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
