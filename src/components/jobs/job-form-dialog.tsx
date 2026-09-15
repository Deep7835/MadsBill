"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  JOB_CUSTOMER_TYPES,
  JOB_PAYMENT_MODES,
  JOB_STATUSES,
  jobEntrySchema,
  type JobEntryFormValues,
  type JobEntryPayload,
} from "@/lib/validations/job";
import { saveJobEntry } from "@/lib/queries";
import { formatCurrency, toDateInput } from "@/lib/format";
import type { JobEntry } from "@/lib/types/database";

const EMPTY: JobEntryFormValues = {
  date: toDateInput(new Date()),
  customer_name: "",
  mobile: "",
  product_name: "",
  size: "",
  qty: 1,
  total_sale: "",
  advance_paid: 0,
  status: "Pending",
  customer_type: "New",
  primary_staff: "",
  payment_mode: "UPI",
  delivery_date: "",
  actual_delivery_date: "",
  direct_cost: 0,
};

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: JobEntry | null;
  onSaved: (job: JobEntry) => void;
}

export function JobFormDialog({ open, onOpenChange, job, onSaved }: JobFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<JobEntryFormValues, unknown, JobEntryPayload>({
    resolver: zodResolver(jobEntrySchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      job
        ? {
            date: toDateInput(job.date),
            customer_name: job.customer_name,
            mobile: job.mobile ?? "",
            product_name: job.product_name,
            size: job.size ?? "",
            qty: Number(job.qty),
            total_sale: Number(job.total_sale),
            advance_paid: Number(job.advance_paid),
            status: job.status,
            customer_type: job.customer_type ?? "New",
            primary_staff: job.primary_staff ?? "",
            payment_mode: job.payment_mode ?? "UPI",
            delivery_date: toDateInput(job.delivery_date),
            actual_delivery_date: toDateInput(job.actual_delivery_date),
            direct_cost: Number(job.direct_cost),
          }
        : { ...EMPTY, date: toDateInput(new Date()) },
    );
  }, [open, job, reset]);

  // Balance and gross profit are not stored — preview them so the counter can
  // sanity-check the figures before saving.
  const totalSale = Number(watch("total_sale")) || 0;
  const balance = totalSale - (Number(watch("advance_paid")) || 0);
  const grossProfit = totalSale - (Number(watch("direct_cost")) || 0);

  async function onSubmit(values: JobEntryPayload) {
    setSubmitting(true);
    try {
      const saved = await saveJobEntry(values, job?.id);
      toast.success(job ? "Job updated" : `Job ${saved.job_number} added`);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save job", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{job ? `Edit ${job.job_number}` : "New job entry"}</DialogTitle>
          <DialogDescription>
            Record the order, the advance collected and the direct cost. Balance and gross
            profit are worked out for you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Date" htmlFor="date" error={errors.date?.message} required>
              <Input id="date" type="date" {...register("date")} />
            </FormField>

            <FormField
              label="Customer"
              htmlFor="customer_name"
              error={errors.customer_name?.message}
              required
            >
              <Input id="customer_name" placeholder="Sharma Traders" {...register("customer_name")} />
            </FormField>

            <FormField label="Mobile" htmlFor="mobile" error={errors.mobile?.message}>
              <Input id="mobile" inputMode="tel" placeholder="98765 43210" {...register("mobile")} />
            </FormField>

            <FormField
              label="Product"
              htmlFor="product_name"
              error={errors.product_name?.message}
              required
              className="sm:col-span-2"
            >
              <Input id="product_name" placeholder="Flex banner / Visiting cards" {...register("product_name")} />
            </FormField>

            <FormField label="Size" htmlFor="size" error={errors.size?.message} hint="e.g. 4x3 ft">
              <Input id="size" placeholder="4x3" {...register("size")} />
            </FormField>

            <FormField label="Qty" htmlFor="qty" error={errors.qty?.message} required>
              <Input id="qty" type="number" step="0.01" min="0" inputMode="decimal" {...register("qty")} />
            </FormField>

            <FormField
              label="Total sale (₹)"
              htmlFor="total_sale"
              error={errors.total_sale?.message}
              required
            >
              <Input
                id="total_sale"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("total_sale")}
              />
            </FormField>

            <FormField
              label="Advance paid (₹)"
              htmlFor="advance_paid"
              error={errors.advance_paid?.message}
              hint={`Balance ${formatCurrency(balance)}`}
            >
              <Input
                id="advance_paid"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("advance_paid")}
              />
            </FormField>

            <FormField label="Status" error={errors.status?.message} required>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={!!errors.status}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Customer type" error={errors.customer_type?.message} required>
              <Controller
                control={control}
                name="customer_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CUSTOMER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Payment mode" error={errors.payment_mode?.message} required>
              <Controller
                control={control}
                name="payment_mode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_PAYMENT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Primary staff" htmlFor="primary_staff" error={errors.primary_staff?.message}>
              <Input id="primary_staff" placeholder="Who is making it" {...register("primary_staff")} />
            </FormField>

            <FormField label="Delivery date" htmlFor="delivery_date" error={errors.delivery_date?.message}>
              <Input id="delivery_date" type="date" {...register("delivery_date")} />
            </FormField>

            <FormField
              label="Actual delivery"
              htmlFor="actual_delivery_date"
              error={errors.actual_delivery_date?.message}
            >
              <Input id="actual_delivery_date" type="date" {...register("actual_delivery_date")} />
            </FormField>

            <FormField
              label="Direct cost (₹)"
              htmlFor="direct_cost"
              error={errors.direct_cost?.message}
              hint={`Gross profit ${formatCurrency(grossProfit)}`}
            >
              <Input
                id="direct_cost"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("direct_cost")}
              />
            </FormField>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {job ? "Save changes" : "Add job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
