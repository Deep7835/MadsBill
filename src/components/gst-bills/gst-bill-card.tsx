"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  Invoice03Icon,
  PencilEdit02Icon,
  PrinterIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateGstBill, setDocumentGst, updateGstBill } from "@/lib/queries";
import { downloadQuotationPdf, printQuotationPdf } from "@/lib/pdf/quotation-pdf";
import { formatDate, toDateInput } from "@/lib/format";
import type { Quotation, QuotationFull, Settings } from "@/lib/types/database";

const MIGRATION = "supabase/migrations/20260924000000_gst_bills.sql";

/** Turns "function not found" into the one step that fixes it. */
export function gstBillErrorMessage(err: unknown): string | undefined {
  const message = err instanceof Error ? err.message : undefined;
  if (message && /generate_gst_bill|bill_number|schema cache/i.test(message)) {
    return `GST bills are not set up in the database yet. Run ${MIGRATION} in the Supabase SQL editor.`;
  }
  return message;
}

/** Print / download a GST bill, with toasts. Shared by the invoice page and the GST Bills list. */
export function useGstBillPdf(settings: Settings | null) {
  const [busy, setBusy] = useState<{ id: string; action: "print" | "pdf" } | null>(null);

  async function run(action: "print" | "pdf", quotation: QuotationFull) {
    setBusy({ id: quotation.id, action });
    try {
      if (action === "pdf") {
        await downloadQuotationPdf({ quotation, settings, gstBill: true });
        toast.success(`${quotation.bill_number} downloaded`);
      } else {
        await printQuotationPdf({ quotation, settings, gstBill: true });
      }
    } catch (err) {
      toast.error(action === "pdf" ? "Could not generate the PDF" : "Could not open the print view", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    print: (quotation: QuotationFull) => run("print", quotation),
    download: (quotation: QuotationFull) => run("pdf", quotation),
  };
}

/**
 * Renames / re-dates an issued bill. GST law wants tax-invoice numbers
 * consecutive and permanent, so this is a deliberate override — the unique
 * index still stops two bills sharing a number.
 */
export function EditGstBillDialog({
  invoice,
  onOpenChange,
  onSaved,
}: {
  invoice: Pick<Quotation, "id" | "bill_number" | "bill_date" | "date"> | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Quotation) => void | Promise<void>;
}) {
  const [number, setNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setNumber(invoice.bill_number ?? "");
    setBillDate(toDateInput(invoice.bill_date ?? invoice.date));
  }, [invoice]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setSaving(true);
    try {
      const updated = await updateGstBill(invoice.id, number.trim(), billDate || null);
      toast.success(`Saved as ${updated.bill_number}`);
      await onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save the GST bill", { description: gstBillErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit GST bill</DialogTitle>
          <DialogDescription>
            Renaming changes the number printed on the bill. Keep the series consecutive — GST
            returns are filed against these numbers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <FormField label="Bill number" htmlFor="bill_number" required>
            <Input
              id="bill_number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="MK-007"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Bill date" htmlFor="bill_date">
            <Input
              id="bill_date"
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!number.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Confirms, then asks the database for the next MK-### number. */
export function GenerateGstBillDialog({
  invoice,
  onOpenChange,
  onGenerated,
}: {
  invoice: Pick<Quotation, "id" | "quote_number"> | null;
  onOpenChange: (open: boolean) => void;
  onGenerated: (updated: Quotation) => void | Promise<void>;
}) {
  async function handleConfirm() {
    if (!invoice) return;
    try {
      const updated = await generateGstBill(invoice.id);
      toast.success(`GST bill ${updated.bill_number} generated`);
      await onGenerated(updated);
    } catch (err) {
      toast.error("Could not generate the GST bill", { description: gstBillErrorMessage(err) });
    }
  }

  return (
    <ConfirmDialog
      open={!!invoice}
      onOpenChange={onOpenChange}
      title={`Generate GST bill for ${invoice?.quote_number ?? "this invoice"}?`}
      description="It gets the next number in the MK-001 series and today's date. The number is permanent, so check the customer's GSTIN and the line items first."
      confirmLabel="Generate GST bill"
      destructive={false}
      onConfirm={handleConfirm}
    />
  );
}

/** The GST bill panel on an invoice's detail page. */
export function GstBillCard({
  quotation,
  settings,
  onGenerated,
}: {
  quotation: QuotationFull;
  settings: Settings | null;
  onGenerated: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const { busy, print, download } = useGstBillPdf(settings);
  const billed = !!quotation.bill_number;
  const taxed = quotation.gst_enabled !== false;

  async function handleEnableGst() {
    setEnabling(true);
    try {
      await setDocumentGst(quotation.id, true);
      toast.success("GST applied — the totals have been recalculated");
      await onGenerated();
    } catch (err) {
      toast.error("Could not apply GST", { description: gstBillErrorMessage(err) });
    } finally {
      setEnabling(false);
    }
  }

  // A plain bill has no tax to report, so there is nothing to issue yet.
  if (!taxed) {
    return (
      <Card className="no-print">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HugeiconsIcon icon={Invoice03Icon} className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Raised without GST</p>
              <p className="text-xs text-muted-foreground">
                No tax is charged, so this cannot be issued as a GST bill yet.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleEnableGst} loading={enabling}>
            <HugeiconsIcon icon={Invoice03Icon} />
            Apply GST
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="no-print">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HugeiconsIcon icon={Invoice03Icon} className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {billed ? `GST bill ${quotation.bill_number}` : "GST bill"}
            </p>
            <p className="text-xs text-muted-foreground">
              {billed ? (
                <>
                  Issued {formatDate(quotation.bill_date ?? quotation.date)} ·{" "}
                  <Link href="/gst-bills" className="underline-offset-2 hover:underline">
                    All GST bills
                  </Link>
                </>
              ) : (
                "Not issued yet. Generating one assigns the next MK-001 number."
              )}
            </p>
          </div>
        </div>

        {billed ? (
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <HugeiconsIcon icon={PencilEdit02Icon} />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => print(quotation)}
              loading={busy?.action === "print"}
            >
              <HugeiconsIcon icon={PrinterIcon} />
              Print
            </Button>
            <Button onClick={() => download(quotation)} loading={busy?.action === "pdf"}>
              <HugeiconsIcon icon={Download01Icon} />
              Download
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)}>
            <HugeiconsIcon icon={Invoice03Icon} />
            Generate GST bill
          </Button>
        )}
      </CardContent>

      <GenerateGstBillDialog
        invoice={confirming ? quotation : null}
        onOpenChange={setConfirming}
        onGenerated={onGenerated}
      />

      <EditGstBillDialog
        invoice={editing ? quotation : null}
        onOpenChange={setEditing}
        onSaved={onGenerated}
      />
    </Card>
  );
}
