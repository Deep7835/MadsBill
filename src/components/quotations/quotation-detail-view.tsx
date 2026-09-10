"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Download01Icon,
  Comment01Icon,
  PencilEdit01Icon,
  PrinterIcon,
  ReceiptTextIcon,
  Delete02Icon,
  CreditCardIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocumentPreview } from "@/components/quotations/document-preview";
import { WhatsappShareDialog } from "@/components/quotations/whatsapp-share-dialog";
import { RecordPaymentDialog } from "@/components/customers/record-payment-dialog";
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
  deletePayment,
  deleteQuotation,
  fetchQuotation,
  fetchSettings,
  updatePaymentStatus,
} from "@/lib/queries";
import { downloadQuotationPdf, printQuotationPdf } from "@/lib/pdf/quotation-pdf";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer, PaymentStatus } from "@/lib/types/database";

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
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

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

  async function handleDeletePayment() {
    if (!deletingPaymentId) return;
    try {
      await deletePayment(deletingPaymentId);
      toast.success("Payment deleted");
      await refresh();
    } catch (err) {
      toast.error("Could not delete payment", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingPaymentId(null);
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
  const payments = data.payments ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const grandTotal = Number(data.grand_total);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const effectiveCustomer: Customer | null = data.customer ?? (data.customer_id ? {
    id: data.customer_id,
    business_name: "Customer",
    contact_person: null,
    mobile: null,
    email: null,
    gst_number: null,
    address: null,
    city: null,
    state: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit no-print">
        <Link href="/quotations">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          All quotations
        </Link>
      </Button>

      <div className="no-print">
        <PageHeader
          title={data.quote_number}
          description={`${data.customer?.business_name ?? "Customer"} · ${formatDate(data.date)} · ${formatCurrency(data.grand_total)}`}
        >
          {/* Actions grid */}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {isInvoice && (
              <Button variant="default" onClick={() => setRecordPaymentOpen(true)}>
                <HugeiconsIcon icon={CreditCardIcon} />
                Record Payment
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} loading={busy === "print"}>
              <HugeiconsIcon icon={PrinterIcon} />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload} loading={busy === "pdf"}>
              <HugeiconsIcon icon={Download01Icon} />
              <span className="truncate">Download PDF</span>
            </Button>
            <Button variant="outline" onClick={() => setShareOpen(true)}>
              <HugeiconsIcon icon={Comment01Icon} />
              WhatsApp
            </Button>
            <Button asChild variant="outline">
              <Link href={`/quotations/${data.id}/edit`}>
                <HugeiconsIcon icon={PencilEdit01Icon} />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              className="col-span-2 text-destructive sm:col-span-1"
              onClick={() => setConfirmDelete(true)}
            >
              <HugeiconsIcon icon={Delete02Icon} />
              Delete
            </Button>
          </div>
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
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={() => setRecordPaymentOpen(true)}>
                  <HugeiconsIcon icon={CreditCardIcon} className="mr-1 h-4 w-4" />
                  + Record Payment
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="payment" className="text-xs text-muted-foreground">
                    Status
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
              </div>
            ) : (
              <Button onClick={() => setConfirmConvert(true)} loading={busy === "convert"}>
                <HugeiconsIcon icon={ReceiptTextIcon} />
                Convert to invoice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DocumentPreview quotation={data} settings={settings ?? null} />

      {/* Payment History & Ledger section */}
      {isInvoice && (
        <Card className="no-print mt-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <HugeiconsIcon icon={CreditCardIcon} className="h-5 w-5 text-primary" />
                  Payment History & Ledger
                </h3>
                <p className="text-xs text-muted-foreground">
                  Track payments received towards invoice {data.quote_number}
                </p>
              </div>
              <Button size="sm" onClick={() => setRecordPaymentOpen(true)}>
                <HugeiconsIcon icon={CreditCardIcon} className="mr-1.5 h-4 w-4" />
                + Record Payment
              </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground font-medium">Total Amount</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(grandTotal)}</div>
              </div>
              <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-3">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Total Paid</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="rounded-lg border bg-amber-500/10 border-amber-500/20 p-3">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium font-semibold">Balance Due</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-0.5">{formatCurrency(balanceDue)}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 flex flex-col justify-center">
                <div className="text-xs text-muted-foreground font-medium mb-1">Payment Status</div>
                <div>
                  <PaymentStatusBadge status={data.payment_status} />
                </div>
              </div>
            </div>

            {/* Payments Table */}
            {payments.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10">
                No payments recorded yet. Click <strong>"+ Record Payment"</strong> to enter a partial or full payment.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Ref / UTR No.</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium">{formatDate(p.payment_date)}</td>
                        <td className="py-2.5 px-3">{p.payment_mode}</td>
                        <td className="py-2.5 px-3 font-mono">{p.reference_no || "—"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.notes || "—"}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingPaymentId(p.id)}
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <WhatsappShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        quotation={data}
        settings={settings ?? null}
      />

      {effectiveCustomer && (
        <RecordPaymentDialog
          open={recordPaymentOpen}
          onOpenChange={setRecordPaymentOpen}
          customer={effectiveCustomer}
          presetQuotationId={data.id}
          presetAmount={balanceDue > 0 ? balanceDue : undefined}
          onPaymentSaved={refresh}
        />
      )}

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

      <ConfirmDialog
        open={!!deletingPaymentId}
        onOpenChange={(op) => {
          if (!op) setDeletingPaymentId(null);
        }}
        title="Delete payment record?"
        description="This payment entry will be deleted and the invoice payment status will be updated automatically."
        confirmLabel="Delete Payment"
        onConfirm={handleDeletePayment}
      />
    </>
  );
}
