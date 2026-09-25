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
import { GST_STATES } from "@/lib/gst-states";
import { describeGstin, parseGstin } from "@/lib/gstin";
import { cn } from "@/lib/utils";

/** Mirrors GstTaxpayer from the server route — kept local so the client bundle
 *  never imports the server-only lookup module. */
interface GstTaxpayerDto {
  legalName: string | null;
  tradeName: string | null;
  status: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormValues, unknown, CustomerPayload>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  });

  // A GSTIN carries its own state code and PAN, so those fill themselves in as
  // soon as a valid one is typed — no lookup service involved.
  const gstin = parseGstin(watch("gst_number"));
  const gstinHint = describeGstin(gstin);

  const [fetching, setFetching] = useState(false);

  /** Pulls legal name and address from the GST provider via our server route. */
  async function handleFetchDetails() {
    setFetching(true);
    try {
      const response = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: gstin.gstin }),
      });
      const body = (await response.json()) as { taxpayer?: GstTaxpayerDto; error?: string };

      if (!response.ok || !body.taxpayer) {
        toast.error("Could not fetch GST details", { description: body.error });
        return;
      }

      const t = body.taxpayer;
      const fill = (field: "business_name" | "address" | "city" | "state", value: string | null) => {
        if (value) setValue(field, value, { shouldDirty: true, shouldValidate: true });
      };

      // Trade name is what the business is actually called; legal name is the fallback.
      fill("business_name", t.tradeName || t.legalName);
      fill("address", t.address);
      fill("city", t.city);
      fill("state", t.state);

      toast.success(t.tradeName || t.legalName || "Details fetched", {
        description: t.status && t.status !== "Active" ? `GST status: ${t.status}` : undefined,
      });
    } catch {
      toast.error("Could not reach the lookup service");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!gstin.valid || !gstin.stateName) return;
    // Only correct a state that disagrees with the GSTIN; never clobber a
    // blank one the user is still filling in elsewhere.
    if (watch("state") !== gstin.stateName) {
      setValue("state", gstin.stateName, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstin.valid, gstin.stateName]);

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
              hint={gstinHint ?? "15 characters, optional — state fills in automatically"}
            >
              <div className="flex gap-2">
                <Input
                  id="gst_number"
                  placeholder="27AAPFU0939F1ZV"
                  className={cn(
                    "uppercase",
                    gstin.wellFormed && !gstin.valid && "border-destructive",
                    gstin.valid && "border-[var(--success)]",
                  )}
                  aria-invalid={gstin.wellFormed && !gstin.valid}
                  {...register("gst_number", {
                    setValueAs: (v: string) => (v ?? "").toUpperCase().trim(),
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={handleFetchDetails}
                  loading={fetching}
                  disabled={!gstin.valid}
                  title={
                    gstin.valid
                      ? "Fetch name and address from the GST portal"
                      : "Enter a valid GSTIN first"
                  }
                >
                  Fetch
                </Button>
              </div>
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

            <FormField
              label="State"
              htmlFor="state"
              error={errors.state?.message}
              hint="Decides CGST+SGST vs IGST — pick from the list so it resolves."
            >
              {/* A datalist keeps free typing possible while steering to the
                  official names the GST state codes are matched against. */}
              <Input
                id="state"
                list="gst-states"
                placeholder="Uttar Pradesh"
                autoComplete="off"
                {...register("state")}
              />
              <datalist id="gst-states">
                {GST_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code}
                  </option>
                ))}
              </datalist>
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
