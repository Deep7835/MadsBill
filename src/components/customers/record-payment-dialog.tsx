"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { recordPayment } from "@/lib/queries";
import type { Customer, QuotationWithCustomer } from "@/lib/types/database";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  quotations?: QuotationWithCustomer[];
  onPaymentSaved: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  customer,
  quotations = [],
  onPaymentSaved,
}: RecordPaymentDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("none");

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      amount: "",
      payment_date: new Date().toISOString().split("T")[0],
      reference_no: "",
      notes: "",
    },
  });

  async function onSubmit(values: { amount: string; payment_date: string; reference_no: string; notes: string }) {
    const amt = parseFloat(values.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setSubmitting(true);
    try {
      await recordPayment({
        customer_id: customer.id,
        quotation_id: selectedQuoteId !== "none" ? selectedQuoteId : null,
        amount: amt,
        payment_date: values.payment_date,
        payment_mode: paymentMode,
        reference_no: values.reference_no,
        notes: values.notes,
      });

      toast.success("Payment recorded successfully");
      reset();
      onPaymentSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not record payment", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <HugeiconsIcon icon={CreditCardIcon} className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record cash, UPI, or bank transfer payments from {customer.business_name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1" noValidate>
          <FormField label="Amount (₹)" htmlFor="amount" required>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 5000"
              {...register("amount", { required: true })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Mode">
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Payment Date">
              <Input type="date" {...register("payment_date")} />
            </FormField>
          </div>

          {quotations.length > 0 ? (
            <FormField label="Link to Invoice (Optional)">
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General Payment (Unlinked)</SelectItem>
                  {quotations.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.quote_number} (₹{q.grand_total})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          <FormField label="Reference / UTR No. (Optional)">
            <Input placeholder="e.g. UPI-923847293847" {...register("reference_no")} />
          </FormField>

          <FormField label="Notes (Optional)">
            <Textarea rows={2} placeholder="Advance for flex printing..." {...register("notes")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
