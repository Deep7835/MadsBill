"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchSettings, saveSettings } from "@/lib/queries";
import {
  settingsSchema,
  type SettingsFormValues,
  type SettingsPayload,
} from "@/lib/validations/settings";

const EMPTY: SettingsFormValues = {
  company_name: "Madskraft Flex & Advertising",
  logo_url: "",
  gst_number: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  bank_details: "",
  terms: "",
};

export function SettingsView() {
  const { data, loading, refresh } = useAsyncData(fetchSettings, [], {
    errorMessage: "Could not load settings",
  });
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues, unknown, SettingsPayload>({
    resolver: zodResolver(settingsSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!data) return;
    reset({
      company_name: data.company_name ?? "",
      logo_url: data.logo_url ?? "",
      gst_number: data.gst_number ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      website: data.website ?? "",
      bank_details: data.bank_details ?? "",
      terms: data.terms ?? "",
    });
  }, [data, reset]);

  const logoUrl = watch("logo_url");

  async function onSubmit(values: SettingsPayload) {
    setSubmitting(true);
    try {
      await saveSettings(values);
      toast.success("Settings saved");
      await refresh();
    } catch (err) {
      toast.error("Could not save settings", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company details printed on every quotation and invoice PDF."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Appears in the PDF header and the sidebar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Company name"
              htmlFor="company_name"
              error={errors.company_name?.message}
              required
              className="sm:col-span-2"
            >
              <Input
                id="company_name"
                aria-invalid={!!errors.company_name}
                {...register("company_name")}
              />
            </FormField>

            <FormField
              label="Logo URL"
              htmlFor="logo_url"
              error={errors.logo_url?.message}
              hint="Public image URL (PNG or JPG). Leave blank for a text-only header."
              className="sm:col-span-2"
            >
              <Input
                id="logo_url"
                placeholder="https://…/logo.png"
                {...register("logo_url")}
              />
            </FormField>

            {logoUrl && !errors.logo_url ? (
              <div className="sm:col-span-2">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                  {/* Arbitrary external host — plain <img> avoids next/image remote config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Company logo preview" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            ) : null}

            <FormField label="GSTIN" htmlFor="gst_number" error={errors.gst_number?.message}>
              <Input
                id="gst_number"
                className="uppercase"
                placeholder="09ABCDE1234F1Z5"
                {...register("gst_number", {
                  setValueAs: (v: string) => (v ?? "").toUpperCase().trim(),
                })}
              />
            </FormField>

            <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" inputMode="tel" placeholder="+91 98765 43210" {...register("phone")} />
            </FormField>

            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </FormField>

            <FormField label="Website" htmlFor="website" error={errors.website?.message}>
              <Input id="website" placeholder="madskraft.in" {...register("website")} />
            </FormField>

            <FormField
              label="Address"
              htmlFor="address"
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <Textarea id="address" rows={2} {...register("address")} />
            </FormField>

            <FormField label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" {...register("city")} />
            </FormField>

            <FormField label="State" htmlFor="state" error={errors.state?.message}>
              <Input id="state" {...register("state")} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment &amp; terms</CardTitle>
            <CardDescription>Printed at the bottom of every document.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              label="Bank details"
              htmlFor="bank_details"
              error={errors.bank_details?.message}
              hint="One detail per line — printed as-is."
            >
              <Textarea
                id="bank_details"
                rows={5}
                placeholder={"Bank: HDFC Bank\nA/C No: 1234567890\nIFSC: HDFC0001234"}
                {...register("bank_details")}
              />
            </FormField>

            <FormField
              label="Terms & conditions"
              htmlFor="terms"
              error={errors.terms?.message}
              hint="One term per line."
            >
              <Textarea
                id="terms"
                rows={7}
                placeholder={"1. Quotation valid for 15 days.\n2. 50% advance with order."}
                {...register("terms")}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
            disabled={submitting || !isDirty}
          >
            Discard changes
          </Button>
          <Button type="submit" loading={submitting}>
            <Save />
            Save settings
          </Button>
        </div>
      </form>
    </>
  );
}
