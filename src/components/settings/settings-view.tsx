"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CreditCardIcon,
  Image01Icon,
  Comment02Icon,
  FloppyDiskIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { ImageUploadField } from "@/components/shared/image-upload-field";
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
  stamp_url: "",
  signature_url: "",
  gst_number: "",
  default_hsn: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  bank_details: "",
  terms: "",
  upi_id: "",
  upi_name: "",
  sms_api_key: "",
  whatsapp_token: "",
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
    setValue,
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
      stamp_url: data.stamp_url ?? "",
      signature_url: data.signature_url ?? "",
      gst_number: data.gst_number ?? "",
      default_hsn: data.default_hsn ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      website: data.website ?? "",
      bank_details: data.bank_details ?? "",
      terms: data.terms ?? "",
      upi_id: data.upi_id ?? "",
      upi_name: data.upi_name ?? "",
      sms_api_key: data.sms_api_key ?? "",
      whatsapp_token: data.whatsapp_token ?? "",
    });
  }, [data, reset]);

  const logoUrl = watch("logo_url");
  const stampUrl = watch("stamp_url");
  const signatureUrl = watch("signature_url");

  /** Storage uploads write straight into the form, so Save persists the URL. */
  function setAssetUrl(field: "logo_url" | "stamp_url" | "signature_url", url: string | null) {
    setValue(field, url ?? "", { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: SettingsPayload) {
    setSubmitting(true);
    try {
      await saveSettings(values);
      toast.success("Settings saved successfully!");
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
        title="Business & System Settings"
        description="Configure company branding, digital signature & stamp, UPI payment details, and communication APIs."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Company Info */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <HugeiconsIcon icon={Image01Icon} className="h-5 w-5" />
              Company &amp; Branding
            </CardTitle>
            <CardDescription>Primary business details displayed on quotations and invoices.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Company name"
              htmlFor="company_name"
              error={errors.company_name?.message}
              required
              className="sm:col-span-2"
            >
              <Input id="company_name" {...register("company_name")} />
            </FormField>

            <ImageUploadField
              label="Company logo"
              asset="logo"
              value={logoUrl}
              onChange={(url) => setAssetUrl("logo_url", url)}
              error={errors.logo_url?.message}
              hint="Printed at the top-left of every quotation and invoice."
              aspect="wide"
              className="sm:col-span-2"
            />

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

            <FormField
              label="Default HSN / SAC"
              htmlFor="default_hsn"
              error={errors.default_hsn?.message}
              hint="Printed against every invoice line. 998912 covers printing services."
            >
              <Input id="default_hsn" inputMode="numeric" placeholder="998912" {...register("default_hsn")} />
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

            <FormField label="Address" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
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

        {/* Digital Sign & Stamp Section */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <HugeiconsIcon icon={SecurityCheckIcon} className="h-5 w-5" />
              Digital Sign &amp; Stamp
            </CardTitle>
            <CardDescription>
              Upload the company stamp and authorised signature. Both are stored securely and printed in the
              signatory block of every invoice and quotation PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <ImageUploadField
              label="Company stamp"
              asset="stamp"
              value={stampUrl}
              onChange={(url) => setAssetUrl("stamp_url", url)}
              error={errors.stamp_url?.message}
              hint="Round or rectangular stamp. Transparent PNG keeps the paper visible behind it."
            />

            <ImageUploadField
              label="Authorised signature"
              asset="signature"
              value={signatureUrl}
              onChange={(url) => setAssetUrl("signature_url", url)}
              error={errors.signature_url?.message}
              hint="Scan the signature on white paper and save it as a transparent PNG."
              aspect="wide"
            />
          </CardContent>
        </Card>

        {/* Payment & UPI QR Settings */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <HugeiconsIcon icon={CreditCardIcon} className="h-5 w-5" />
              UPI &amp; Payment Options
            </CardTitle>
            <CardDescription>Configure UPI VPA details to automatically generate Payment QR codes on invoices.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="UPI VPA Address" htmlFor="upi_id" error={errors.upi_id?.message} hint="e.g. madskraft@hdfcbank">
              <Input id="upi_id" placeholder="madskraft@hdfcbank" {...register("upi_id")} />
            </FormField>

            <FormField label="Payee Name" htmlFor="upi_name" error={errors.upi_name?.message} hint="Name registered on UPI">
              <Input id="upi_name" placeholder="Madskraft Flex & Advertising" {...register("upi_name")} />
            </FormField>

            <FormField
              label="Bank details"
              htmlFor="bank_details"
              error={errors.bank_details?.message}
              hint="Printed at bottom of documents."
              className="sm:col-span-2"
            >
              <Textarea
                id="bank_details"
                rows={4}
                placeholder={"Bank: HDFC Bank\nA/C No: 1234567890\nIFSC: HDFC0001234"}
                {...register("bank_details")}
              />
            </FormField>

            <FormField
              label="Terms & conditions"
              htmlFor="terms"
              error={errors.terms?.message}
              hint="One term per line."
              className="sm:col-span-2"
            >
              <Textarea
                id="terms"
                rows={5}
                placeholder={"1. Quotation valid for 15 days.\n2. 50% advance required with order."}
                {...register("terms")}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Communication API Credentials */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <HugeiconsIcon icon={Comment02Icon} className="h-5 w-5" />
              SMS &amp; WhatsApp Integration
            </CardTitle>
            <CardDescription>Enter optional API credentials to send automated reminders and invoices via WhatsApp and SMS.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="SMS Gateway API Key" htmlFor="sms_api_key" error={errors.sms_api_key?.message} hint="MSG91 or Twilio API key">
              <Input id="sms_api_key" type="password" placeholder="••••••••••••••••" {...register("sms_api_key")} />
            </FormField>

            <FormField label="WhatsApp Business Token" htmlFor="whatsapp_token" error={errors.whatsapp_token?.message} hint="Meta Cloud API Token (Optional)">
              <Input id="whatsapp_token" type="password" placeholder="••••••••••••••••" {...register("whatsapp_token")} />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
            disabled={submitting || !isDirty}
          >
            Discard changes
          </Button>
          <Button type="submit" loading={submitting} className="shadow-sm">
            <HugeiconsIcon icon={FloppyDiskIcon} className="h-4 w-4 mr-1" />
            Save all settings
          </Button>
        </div>
      </form>
    </>
  );
}
