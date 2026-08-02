"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import {
  customerSchema,
  type CustomerFormValues,
  type CustomerPayload,
} from "@/lib/validations/customer";
import { saveCustomer } from "@/lib/queries";
import type { Customer } from "@/lib/types/database";

const EMPTY: CustomerFormValues = {
  business_name: "",
  contact_person: "",
  mobile: "",
  email: "",
  gst_number: "",
  address: "",
  city: "",
  state: "",
};

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved: (customer: Customer) => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues, unknown, CustomerPayload>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      customer
        ? {
            business_name: customer.business_name ?? "",
            contact_person: customer.contact_person ?? "",
            mobile: customer.mobile ?? "",
            email: customer.email ?? "",
            gst_number: customer.gst_number ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            state: customer.state ?? "",
          }
        : EMPTY,
    );
  }, [open, customer, reset]);

  async function onSubmit(values: CustomerPayload) {
    setSubmitting(true);
    try {
      const saved = await saveCustomer(values, customer?.id);
      toast.success(customer ? "Customer updated" : "Customer added");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save customer", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            These details appear on the quotation and invoice PDFs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Business name"
              htmlFor="business_name"
              error={errors.business_name?.message}
              required
              className="sm:col-span-2"
            >
              <Input
                id="business_name"
                placeholder="Sharma Traders"
                aria-invalid={!!errors.business_name}
                {...register("business_name")}
              />
            </FormField>

            <FormField label="Contact person" htmlFor="contact_person" error={errors.contact_person?.message}>
              <Input id="contact_person" placeholder="Rahul Sharma" {...register("contact_person")} />
            </FormField>

            <FormField label="Mobile" htmlFor="mobile" error={errors.mobile?.message}>
              <Input id="mobile" inputMode="tel" placeholder="98765 43210" {...register("mobile")} />
            </FormField>

            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="name@example.com" {...register("email")} />
            </FormField>

            <FormField
              label="GSTIN"
              htmlFor="gst_number"
              error={errors.gst_number?.message}
              hint="15 characters, optional"
            >
              <Input
                id="gst_number"
                placeholder="09ABCDE1234F1Z5"
                className="uppercase"
                {...register("gst_number", {
                  setValueAs: (v: string) => (v ?? "").toUpperCase().trim(),
                })}
              />
            </FormField>

            <FormField
              label="Address"
              htmlFor="address"
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <Textarea id="address" rows={2} placeholder="Shop / street / area" {...register("address")} />
            </FormField>

            <FormField label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" placeholder="Noida" {...register("city")} />
            </FormField>

            <FormField label="State" htmlFor="state" error={errors.state?.message}>
              <Input id="state" placeholder="Uttar Pradesh" {...register("state")} />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {customer ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
