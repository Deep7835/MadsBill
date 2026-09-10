"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HugeiconsIcon } from "@hugeicons/react";
import { Task01Icon } from "@hugeicons/core-free-icons";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { createJobSheetEntry, getNextJobNumber, updateJobSheetEntry } from "@/lib/queries";
import type { JobSheetEntry, JobSheetStatus, JobCustomerType } from "@/lib/types/database";

interface JobEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryToEdit?: JobSheetEntry | null;
  onSaved: () => void;
}

export function JobEntryDialog({
  open,
  onOpenChange,
  entryToEdit,
  onSaved,
}: JobEntryDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<JobSheetStatus>("In Production");
  const [customerType, setCustomerType] = useState<JobCustomerType>("New");
  const [paymentMode, setPaymentMode] = useState<string>("UPI");

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      job_number: "",
      date: new Date().toISOString().split("T")[0],
      customer_name: "",
      mobile: "",
      product_name: "",
      size: "",
      qty: "1",
      total_sale: "",
      advance_paid: "",
      primary_staff: "",
      delivery_date: "",
      actual_delivery_date: "",
      direct_cost: "",
    },
  });

  const totalSaleVal = parseFloat(watch("total_sale") || "0") || 0;
  const advancePaidVal = parseFloat(watch("advance_paid") || "0") || 0;
  const directCostVal = parseFloat(watch("direct_cost") || "0") || 0;

  const balanceVal = Math.max(0, totalSaleVal - advancePaidVal);
  const grossProfitVal = totalSaleVal - directCostVal;

  useEffect(() => {
    if (!open) return;

    if (entryToEdit) {
      setValue("job_number", entryToEdit.job_number);
      setValue("date", entryToEdit.date);
      setValue("customer_name", entryToEdit.customer_name);
      setValue("mobile", entryToEdit.mobile || "");
      setValue("product_name", entryToEdit.product_name);
      setValue("size", entryToEdit.size || "");
      setValue("qty", entryToEdit.qty?.toString() || "1");
      setValue("total_sale", entryToEdit.total_sale?.toString() || "0");
      setValue("advance_paid", entryToEdit.advance_paid?.toString() || "0");
      setValue("primary_staff", entryToEdit.primary_staff || "");
      setValue("delivery_date", entryToEdit.delivery_date || "");
      setValue("actual_delivery_date", entryToEdit.actual_delivery_date || "");
      setValue("direct_cost", entryToEdit.direct_cost?.toString() || "0");
      setStatus(entryToEdit.status || "In Production");
      setCustomerType((entryToEdit.customer_type as JobCustomerType) || "New");
      setPaymentMode(entryToEdit.payment_mode || "UPI");
    } else {
      getNextJobNumber().then((nextNo) => {
        reset({
          job_number: nextNo,
          date: new Date().toISOString().split("T")[0],
          customer_name: "",
          mobile: "",
          product_name: "",
          size: "",
          qty: "1",
          total_sale: "",
          advance_paid: "",
          primary_staff: "",
          delivery_date: "",
          actual_delivery_date: "",
          direct_cost: "",
        });
        setStatus("In Production");
        setCustomerType("New");
        setPaymentMode("UPI");
      });
    }
  }, [open, entryToEdit, reset, setValue]);

  async function onSubmit(values: Record<string, string>) {
    if (!values.job_number.trim()) {
      toast.error("Please enter a Job ID");
      return;
    }
    if (!values.customer_name.trim()) {
      toast.error("Please enter Customer Name");
      return;
    }
    if (!values.product_name.trim()) {
      toast.error("Please enter Product Name");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<JobSheetEntry> = {
        job_number: values.job_number.trim(),
        date: values.date,
        customer_name: values.customer_name.trim(),
        mobile: values.mobile.trim() || null,
        product_name: values.product_name.trim(),
        size: values.size.trim() || null,
        qty: parseFloat(values.qty) || 1,
        total_sale: parseFloat(values.total_sale) || 0,
        advance_paid: parseFloat(values.advance_paid) || 0,
        status,
        customer_type: customerType,
        primary_staff: values.primary_staff.trim() || null,
        payment_mode: paymentMode,
        delivery_date: values.delivery_date || null,
        actual_delivery_date: values.actual_delivery_date || null,
        direct_cost: parseFloat(values.direct_cost) || 0,
      };

      if (entryToEdit) {
        await updateJobSheetEntry(entryToEdit.id, payload);
        toast.success(`Updated ${values.job_number}`);
      } else {
        await createJobSheetEntry(payload);
        toast.success(`Recorded ${values.job_number}`);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save job entry", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <HugeiconsIcon icon={Task01Icon} className="h-5 w-5" />
            {entryToEdit ? `Edit Job Sheet Entry (${entryToEdit.job_number})` : "New Daily Job Sheet Entry"}
          </DialogTitle>
          <DialogDescription>
            Record daily work details, customer payments, costs, and profit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
          {/* Row 1: Job Number & Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Job ID" htmlFor="job_number" required>
              <Input
                id="job_number"
                placeholder="e.g. JOB-0010"
                {...register("job_number", { required: true })}
              />
            </FormField>
            <FormField label="Date" htmlFor="date" required>
              <Input id="date" type="date" {...register("date", { required: true })} />
            </FormField>
          </div>

          {/* Row 2: Customer & Mobile */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Customer Name" htmlFor="customer_name" required>
              <Input
                id="customer_name"
                placeholder="e.g. Robin / Saurav Suman"
                {...register("customer_name", { required: true })}
              />
            </FormField>
            <FormField label="Mobile Number">
              <Input
                id="mobile"
                placeholder="e.g. 98100 12345"
                {...register("mobile")}
              />
            </FormField>
          </div>

          {/* Row 3: Product, Size, Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 sm:col-span-1">
              <FormField label="Product" htmlFor="product_name" required>
                <Input
                  id="product_name"
                  placeholder="e.g. Flex / T-shirt / Sunboard"
                  {...register("product_name", { required: true })}
                />
              </FormField>
            </div>
            <FormField label="Size (Opt)">
              <Input id="size" placeholder="e.g. 6 / 10x12" {...register("size")} />
            </FormField>
            <FormField label="Qty" htmlFor="qty" required>
              <Input
                id="qty"
                type="number"
                min="1"
                step="1"
                {...register("qty", { required: true })}
              />
            </FormField>
          </div>

          {/* Row 4: Financials (Total Sale, Advance Paid, Auto Balance) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-muted/20 p-3 rounded-lg border">
            <FormField label="Total Sale (₹)" htmlFor="total_sale" required>
              <Input
                id="total_sale"
                type="number"
                step="0.01"
                placeholder="e.g. 1500"
                {...register("total_sale", { required: true })}
              />
            </FormField>

            <FormField label="Advance Paid (₹)" htmlFor="advance_paid">
              <Input
                id="advance_paid"
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                {...register("advance_paid")}
              />
            </FormField>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Balance Due (₹)
              </label>
              <div
                className={`h-9 flex items-center px-3 rounded-md border font-bold text-sm ${
                  balanceVal > 0
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                ₹{balanceVal.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Row 5: Cost & Gross Profit */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 bg-muted/20 p-3 rounded-lg border">
            <FormField label="Direct Cost (₹)" htmlFor="direct_cost">
              <Input
                id="direct_cost"
                type="number"
                step="0.01"
                placeholder="e.g. 760"
                {...register("direct_cost")}
              />
            </FormField>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Gross Profit (₹)
              </label>
              <div
                className={`h-9 flex items-center px-3 rounded-md border font-bold text-sm ${
                  grossProfitVal >= 0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              >
                ₹{grossProfitVal.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Row 6: Status, Customer Type, Payment Mode */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as JobSheetStatus)}>
                <SelectTrigger>
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
            </FormField>

            <FormField label="Customer Type">
              <Select value={customerType} onValueChange={(v) => setCustomerType(v as JobCustomerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Repeat">Repeat</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Payment Mode">
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Credit">Credit / Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Row 7: Primary Staff & Delivery Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Primary Staff">
              <Input placeholder="e.g. Rahul / Amit" {...register("primary_staff")} />
            </FormField>

            <FormField label="Delivery Date">
              <Input type="date" {...register("delivery_date")} />
            </FormField>

            <FormField label="Actual Delivery Date">
              <Input type="date" {...register("actual_delivery_date")} />
            </FormField>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {entryToEdit ? "Save Changes" : "Create Job Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
