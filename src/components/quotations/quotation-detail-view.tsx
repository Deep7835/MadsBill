"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  MessageCircle,
  Pencil,
  Printer,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocumentPreview } from "@/components/quotations/document-preview";
import { WhatsappShareDialog } from "@/components/quotations/whatsapp-share-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  convertToInvoice,
  deleteQuotation,
  fetchQuotation,
  fetchSettings,
  updatePaymentStatus,
} from "@/lib/queries";
import { downloadQuotationPdf, printQuotationPdf } from "@/lib/pdf/quotation-pdf";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types/database";

export function QuotationDetailView({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const fetcher = useCallback(() => fetchQuotation(quotationId), [quotationId]);

  const { data, loading, error, refresh, setData } = useAsyncData(fetcher, [quotationId], {
    errorMessage: "Could not load the document",
  });
  const { data: settings } = useAsyncData(fetchSettings, [], {
    errorMessage: "Could not load company settings",
    toastOnError: false,
  });

  const [busy, setBusy] = useState<"pdf" | "print" | "convert" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDownload() {
    if (!data) return;
    setBusy("pdf");
    try {
      await downloadQuotationPdf({ quotation: data, settings: settings ?? null });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error("Could not generate the PDF", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (!data) return;
    setBusy("print");
    try {
      await printQuotationPdf({ quotation: data, settings: settings ?? null });
    } catch (err) {
      toast.error("Could not open the print view", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleConvert() {
    if (!data) return;
    setBusy("convert");
    try {
      await convertToInvoice(data.id);
      toast.success(`${data.quote_number} is now an invoice`);
      await refresh();
    } catch (err) {
      toast.error("Could not convert to invoice", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function handlePaymentChange(value: string) {
    if (!data) return;
    const previous = data.payment_status;
    const next = value as PaymentStatus;
    setData({ ...data, payment_status: next }); // optimistic
    try {
      await updatePaymentStatus(data.id, next);
      toast.success(`Marked as ${next}`);
    } catch (err) {
      setData({ ...data, payment_status: previous });
      toast.error("Could not update payment status", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    if (!data) return;
    try {
      await deleteQuotation(data.id);
      toast.success(`${data.quote_number} deleted`);
      router.push("/quotations");
      router.refresh();
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-[520px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Document not found."}</p>
          <Button asChild variant="outline">
            <Link href="/quotations">Back to quotations</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isInvoice = data.status === "invoice";

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit no-print">
        <Link href="/quotations">
          <ArrowLeft />
          All quotations
        </Link>
      </Button>

      <div className="no-print">
        <PageHeader
          title={data.quote_number}
          description={`${data.customer?.business_name ?? "Customer"} · ${formatDate(data.date)} · ${formatCurrency(data.grand_total)}`}
        >
          <Button variant="outline" onClick={handlePrint} loading={busy === "print"}>
            <Printer />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload} loading={busy === "pdf"}>
            <Download />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            <MessageCircle />
            WhatsApp
          </Button>
          <Button asChild variant="outline">
            <Link href={`/quotations/${data.id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </PageHeader>
      </div>

      <Card className="no-print">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <DocStatusBadge status={data.status} />
            {isInvoice ? <PaymentStatusBadge status={data.payment_status} /> : null}
            {!isInvoice && data.valid_until ? (
              <span className="text-xs text-muted-foreground">
                Valid until {formatDate(data.valid_until)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isInvoice ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="payment" className="text-xs text-muted-foreground">
                  Payment
                </Label>
                <Select value={data.payment_status} onValueChange={handlePaymentChange}>
                  <SelectTrigger id="payment" className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Button onClick={() => setConfirmConvert(true)} loading={busy === "convert"}>
                <ReceiptText />
                Convert to invoice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DocumentPreview quotation={data} settings={settings ?? null} />

      <WhatsappShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        quotation={data}
        settings={settings ?? null}
      />

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title="Convert to invoice?"
        description={`${data.quote_number} will be re-titled "Invoice" on the PDF and start tracking payment status. The number stays the same.`}
        confirmLabel="Convert"
        destructive={false}
        onConfirm={handleConvert}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${data.quote_number}?`}
        description="The document and all its line items will be removed permanently."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
