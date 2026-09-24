"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, Invoice03Icon, PrinterIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { GenerateGstBillDialog, useGstBillPdf } from "@/components/gst-bills/gst-bill-card";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchGstBillInvoices, fetchQuotation, fetchSettings, type GstBillRow } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";

type Tab = "issued" | "pending";
type Action = "print" | "pdf";

/** "MK-012" → 12, so MK-1000 sorts after MK-999. */
const billSeq = (row: GstBillRow) => Number(row.bill_number?.match(/(\d+)$/)?.[1] ?? 0);

export function GstBillsView() {
  const { data, loading, refresh } = useAsyncData(fetchGstBillInvoices, [], {
    errorMessage: "Could not load invoices",
  });
  const { data: settings } = useAsyncData(fetchSettings, [], { toastOnError: false });
  const { print, download } = useGstBillPdf(settings ?? null);

  const [tab, setTab] = useState<Tab>("issued");
  const [generating, setGenerating] = useState<GstBillRow | null>(null);
  const [working, setWorking] = useState<{ id: string; action: Action } | null>(null);

  const { issued, pending } = useMemo(() => {
    // Flattened so the table search matches customer names and GSTINs too.
    const rows = (data ?? []).map((r) => ({
      ...r,
      customer_name: r.customer?.business_name ?? "",
      customer_gstin: r.customer?.gst_number ?? "",
    }));
    return {
      issued: rows.filter((r) => r.bill_number).sort((a, b) => billSeq(b) - billSeq(a)),
      pending: rows.filter((r) => !r.bill_number),
    };
  }, [data]);

  /** The list only carries summary columns; the PDF needs the items and full customer. */
  async function runPdf(row: GstBillRow, action: Action) {
    setWorking({ id: row.id, action });
    try {
      const full = await fetchQuotation(row.id);
      await (action === "print" ? print(full) : download(full));
    } catch (err) {
      toast.error("Could not load the invoice", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  }

  const isBusy = (row: GstBillRow, action: Action) =>
    working?.id === row.id && working.action === action;

  const customerCell = (row: GstBillRow) => (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{row.customer?.business_name ?? "—"}</p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {row.customer?.gst_number || "Unregistered"}
      </p>
    </div>
  );

  const invoiceLink = (row: GstBillRow) => (
    <Link href={`/quotations/${row.id}`} className="text-xs text-muted-foreground hover:text-primary">
      {row.quote_number}
    </Link>
  );

  const issuedColumns: Column<GstBillRow>[] = [
    {
      key: "bill_number",
      header: "Bill No.",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.bill_number}</span>
          {invoiceLink(row)}
        </div>
      ),
    },
    {
      key: "bill_date",
      header: "Bill date",
      render: (row) => <span className="text-xs">{formatDate(row.bill_date ?? row.date)}</span>,
    },
    { key: "customer", header: "Customer", render: customerCell },
    {
      key: "subtotal",
      header: "Taxable",
      className: "text-right tabular-nums",
      render: (row) => formatCurrency(row.subtotal),
    },
    {
      key: "gst_amount",
      header: "GST",
      className: "text-right tabular-nums",
      render: (row) => formatCurrency(row.gst_amount),
    },
    {
      key: "grand_total",
      header: "Total",
      className: "text-right font-bold tabular-nums",
      render: (row) => formatCurrency(row.grand_total),
    },
    {
      key: "payment_status",
      header: "Payment",
      render: (row) => <PaymentStatusBadge status={row.payment_status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-px text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runPdf(row, "print")}
            loading={isBusy(row, "print")}
            disabled={!!working}
            aria-label={`Print ${row.bill_number}`}
          >
            <HugeiconsIcon icon={PrinterIcon} />
            Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runPdf(row, "pdf")}
            loading={isBusy(row, "pdf")}
            disabled={!!working}
            aria-label={`Download ${row.bill_number}`}
          >
            <HugeiconsIcon icon={Download01Icon} />
            PDF
          </Button>
        </div>
      ),
    },
  ];

  const pendingColumns: Column<GstBillRow>[] = [
    {
      key: "quote_number",
      header: "Invoice",
      render: (row) => (
        <Link href={`/quotations/${row.id}`} className="font-bold text-foreground hover:text-primary">
          {row.quote_number}
        </Link>
      ),
    },
    {
      key: "date",
      header: "Invoice date",
      render: (row) => <span className="text-xs">{formatDate(row.date)}</span>,
    },
    { key: "customer", header: "Customer", render: customerCell },
    {
      key: "grand_total",
      header: "Total",
      className: "text-right font-bold tabular-nums",
      render: (row) => formatCurrency(row.grand_total),
    },
    {
      key: "actions",
      header: "",
      className: "w-px text-right",
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setGenerating(row)}>
          <HugeiconsIcon icon={Invoice03Icon} />
          Generate GST bill
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Bills"
        description="Issue invoices as GST bills in the MK-001 series, then print or download them."
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        aria-label="GST bill view"
        segments={[
          { value: "issued", label: `Issued bills${data ? ` (${issued.length})` : ""}` },
          { value: "pending", label: `Ready to bill${data ? ` (${pending.length})` : ""}` },
        ]}
      />

      {tab === "issued" ? (
        <DataTable
          key="issued"
          data={issued}
          columns={issuedColumns}
          isLoading={loading}
          searchPlaceholder="Search bill number or customer..."
          emptyMessage="No GST bills yet. Open 'Ready to bill' and generate one from an invoice."
        />
      ) : (
        <DataTable
          key="pending"
          data={pending}
          columns={pendingColumns}
          isLoading={loading}
          searchPlaceholder="Search invoice number or customer..."
          emptyMessage="Every invoice already has a GST bill. Convert a quotation to an invoice to bill it."
        />
      )}

      <GenerateGstBillDialog
        invoice={generating}
        onOpenChange={(open) => !open && setGenerating(null)}
        onGenerated={async () => {
          await refresh();
          setTab("issued");
        }}
      />
    </div>
  );
}
