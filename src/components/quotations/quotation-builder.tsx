"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Add01Icon,
  UserAdd01Icon,
  FloppyDiskIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { LineItemRow } from "@/components/quotations/line-item-row";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  createQuotation,
  fetchCustomers,
  fetchProducts,
  updateQuotation,
} from "@/lib/queries";
import { calcLine, calcTotals, type CalcLine } from "@/lib/calc";
import { addDays, formatCurrency, toDateInput } from "@/lib/format";
import { consumeDraftItems } from "@/lib/draft";
import {
  quotationSchema,
  type QuotationFormValues,
  type QuotationPayload,
} from "@/lib/validations/quotation";
import type { Customer, QuotationFull } from "@/lib/types/database";

type ItemValues = NonNullable<QuotationFormValues["items"]>[number];

const blankItem = (): ItemValues => ({
  product_id: null,
  description: "",
  rate_type: "sqft",
  width: "",
  height: "",
  qty: 1,
  rate: 0,
  gst_percent: 18,
});

function defaultsFor(quotation?: QuotationFull, presetCustomerId?: string): QuotationFormValues {
  if (quotation) {
    return {
      customer_id: quotation.customer_id,
      date: toDateInput(quotation.date),
      valid_until: quotation.valid_until ? toDateInput(quotation.valid_until) : "",
      status: quotation.status,
      gst_enabled: quotation.gst_enabled ?? true,
      payment_status: quotation.payment_status,
      notes: quotation.notes ?? "",
      items: quotation.items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        description: item.description,
        rate_type: item.rate_type,
        width: item.width ?? "",
        height: item.height ?? "",
        qty: Number(item.qty),
        // Re-open with the pre-discount rate so the slab is not applied twice.
        rate: Number(item.base_rate ?? item.rate),
        gst_percent: Number(item.gst_percent),
      })),
    };
  }

  return {
    customer_id: presetCustomerId ?? "",
    date: toDateInput(new Date()),
    valid_until: toDateInput(addDays(new Date(), 15)),
    status: "quotation",
    gst_enabled: true,
    payment_status: "unpaid",
    notes: "",
    items: [blankItem()],
  };
}

interface QuotationBuilderProps {
  quotation?: QuotationFull;
  presetCustomerId?: string;
  /** Pull line items stashed by the price calculator. */
  fromDraft?: boolean;
  presetStatus?: "quotation" | "invoice";
}

export function QuotationBuilder({
  quotation,
  presetCustomerId,
  fromDraft = false,
  presetStatus,
}: QuotationBuilderProps) {
  const router = useRouter();
  const isEdit = !!quotation;

  const { data: customers, loading: customersLoading, refresh: refreshCustomers } = useAsyncData(
    fetchCustomers,
    [],
    { errorMessage: "Could not load customers" },
  );
  const { data: products, loading: productsLoading } = useAsyncData(fetchProducts, [], {
    errorMessage: "Could not load products",
  });

  const [submitting, setSubmitting] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuotationFormValues, unknown, QuotationPayload>({
    resolver: zodResolver(quotationSchema),
    defaultValues: defaultsFor(quotation, presetCustomerId),
    mode: "onSubmit",
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });

  // Read the calculator hand-off after mount — sessionStorage does not exist
  // during SSR, so doing it in defaultValues would break hydration.
  useEffect(() => {
    if (!fromDraft || isEdit) return;
    const draft = consumeDraftItems();
    if (draft?.length) {
      replace(draft as ItemValues[]);
      toast.success(`${draft.length} line${draft.length === 1 ? "" : "s"} carried over`);
    }
    if (presetStatus) setValue("status", presetStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedItems = watch("items");
  const items = useMemo(() => (watchedItems ?? []) as ItemValues[], [watchedItems]);

  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.is_active),
    [products],
  );

  /** Volume slabs live on the product, so every calculation needs this lookup. */
  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );

  const gstEnabled = watch("gst_enabled") !== false;

  const toCalcLine = useCallback(
    (item: ItemValues): CalcLine => ({
      rate_type: item?.rate_type === "piece" ? "piece" : "sqft",
      width: item?.width,
      height: item?.height,
      qty: item?.qty,
      rate: item?.rate,
      // Each line keeps its own %, but a non-GST document charges none of it,
      // so switching GST back on restores the rates rather than losing them.
      gst_percent: gstEnabled ? item?.gst_percent : 0,
      slabs: item?.product_id ? (productById.get(item.product_id) ?? null) : null,
    }),
    [productById, gstEnabled],
  );

  const totals = useMemo(() => calcTotals(items.map(toCalcLine)), [items, toCalcLine]);

  /** Picking a product pre-fills description, rate type, rate and GST. */
  function handleProductChange(index: number, productId: string) {
    if (productId === "custom") {
      setValue(`items.${index}.product_id`, null, { shouldDirty: true });
      const current = watch(`items.${index}.description`);
      if (!current) setValue(`items.${index}.description`, "Custom Item", { shouldDirty: true });
      return;
    }
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;
    setValue(`items.${index}.product_id`, product.id, { shouldDirty: true });
    setValue(`items.${index}.rate_type`, product.rate_type, { shouldDirty: true });
    setValue(`items.${index}.rate`, Number(product.default_rate), { shouldDirty: true });
    setValue(`items.${index}.gst_percent`, Number(product.gst_percent), { shouldDirty: true });

    const current = watch(`items.${index}.description`);
    if (!current) setValue(`items.${index}.description`, product.name, { shouldDirty: true });
  }

  async function onSubmit(values: QuotationPayload) {
    setSubmitting(true);
    try {
      const lines = values.items.map((item) => {
        const line = toCalcLine(item as ItemValues);
        const { area, amount, rate } = calcLine(line);
        return {
          product_id: item.product_id ?? null,
          description: item.description,
          rate_type: item.rate_type,
          // Size is recorded on every line; it only drives the price for sqft.
          width: item.width ?? null,
          height: item.height ?? null,
          area,
          qty: item.qty,
          // base_rate is what was typed; rate is what the slab actually charges.
          base_rate: item.rate,
          rate,
          // The line keeps its own rate even on a non-GST document; the
          // document flag decides whether any tax is charged, so turning GST
          // back on restores the percentages instead of losing them.
          gst_percent: item.gst_percent,
          amount,
        };
      });

      const computed = calcTotals(values.items.map((item) => toCalcLine(item as ItemValues)));
      const payload = {
        quotation: {
          customer_id: values.customer_id,
          date: values.date,
          valid_until: values.valid_until,
          status: values.status,
          gst_enabled: values.gst_enabled,
          payment_status: values.payment_status,
          notes: values.notes,
          subtotal: computed.subtotal,
          gst_amount: computed.gstAmount,
          grand_total: computed.grandTotal,
        },
        items: lines,
      };

      const saved = isEdit
        ? await updateQuotation(quotation.id, payload)
        : await createQuotation(payload);

      toast.success(isEdit ? "Quotation updated" : `Quotation ${saved.quote_number} created`);
      router.push(`/quotations/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast.error("Could not save quotation", {
        description: err instanceof Error ? err.message : undefined,
      });
      setSubmitting(false);
    }
  }

  const loading = customersLoading || productsLoading;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={isEdit ? `/quotations/${quotation.id}` : "/quotations"}>
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          {isEdit ? "Back to quotation" : "All quotations"}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? `Edit ${quotation.quote_number}` : "New quotation"}
        description={
          isEdit
            ? "Changes replace the existing line items."
            : "The quotation number is generated automatically when you save."
        }
      >
        <Button asChild variant="ghost">
          <Link href={isEdit ? `/quotations/${quotation.id}` : "/quotations"}>Cancel</Link>
        </Button>
        <Button type="submit" form="quotation-form" loading={submitting}>
          <HugeiconsIcon icon={FloppyDiskIcon} />
          {isEdit ? "Save changes" : "Create quotation"}
        </Button>
      </PageHeader>

      <form
        id="quotation-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[minmax(0,1fr)_320px]"
        noValidate
      >
        <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Customer &amp; dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              label="Customer"
              error={errors.customer_id?.message}
              required
              className="sm:col-span-2"
            >
              {loading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <div className="flex gap-2">
                  <Controller
                    control={control}
                    name="customer_id"
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={!!errors.customer_id}>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {(customers ?? []).map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.business_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setCustomerDialogOpen(true)}
                    aria-label="Add customer"
                  >
                    <HugeiconsIcon icon={UserAdd01Icon} />
                  </Button>
                </div>
              )}
            </FormField>

            <FormField label="Date" htmlFor="date" error={errors.date?.message} required>
              <Input id="date" type="date" aria-invalid={!!errors.date} {...register("date")} />
            </FormField>

            <FormField label="Valid until" htmlFor="valid_until" error={errors.valid_until?.message}>
              <Input id="valid_until" type="date" {...register("valid_until")} />
            </FormField>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border py-3.5">
            <CardTitle className="flex items-center gap-2">
              Line items
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {fields.length}
              </span>
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append(blankItem())}>
              <HugeiconsIcon icon={Add01Icon} />
              Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {loading ? (
              <>
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </>
            ) : (
              fields.map((field, index) => (
                <LineItemRow
                  key={field.id}
                  index={index}
                  register={register}
                  setValue={setValue}
                  errors={errors.items}
                  products={activeProducts}
                  value={items[index] ?? blankItem()}
                  onProductChange={handleProductChange}
                  onRemove={remove}
                  removable={fields.length > 1}
                  gstEnabled={gstEnabled}
                />
              ))
            )}

            {!loading ? (
              <button
                type="button"
                onClick={() => append(blankItem())}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add another item
              </button>
            ) : null}

            {errors.items?.message ? (
              <p className="text-xs font-medium text-destructive">{errors.items.message}</p>
            ) : null}
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-5">
              <Textarea
                id="notes"
                rows={4}
                placeholder="Installation included. Delivery within 3 working days."
                aria-invalid={!!errors.notes}
                {...register("notes")}
              />
              <p className="text-xs text-muted-foreground">
                Printed on the PDF above the terms &amp; conditions.
              </p>
              {errors.notes?.message ? (
                <p className="text-xs font-medium text-destructive">{errors.notes.message}</p>
              ) : null}
            </CardContent>
          </Card>

        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <FormField label="Document type">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              </FormField>

              <FormField label="Payment status">
              <Controller
                control={control}
                name="payment_status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              </FormField>

              <FormField
                label="Tax"
                hint={
                  gstEnabled
                    ? "Each line's GST % is charged and the document can be issued as a GST bill."
                    : "No tax is added — the rate is the final price. GST bills need this on."
                }
              >
                <Controller
                  control={control}
                  name="gst_enabled"
                  render={({ field }) => (
                    <SegmentedControl
                      value={field.value === false ? "no-gst" : "gst"}
                      onChange={(value) => field.onChange(value === "gst")}
                      aria-label="Tax treatment"
                      segments={[
                        { value: "gst", label: "With GST" },
                        { value: "no-gst", label: "Without GST" },
                      ]}
                    />
                  )}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items</span>
                <span className="tabular-nums">{fields.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                {gstEnabled ? (
                  <span className="font-medium tabular-nums">
                    {formatCurrency(totals.gstAmount)}
                  </span>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Not applied
                  </span>
                )}
              </div>
              {totals.savings > 0 ? (
                <div className="flex justify-between text-[var(--success)]">
                  <span>Volume discount</span>
                  <span className="font-medium tabular-nums">
                    −{formatCurrency(totals.savings)}
                  </span>
                </div>
              ) : null}
              <Separator className="my-3" />
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Grand total</span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>


              <Button type="submit" className="mt-4 w-full" loading={submitting}>
                <HugeiconsIcon icon={FloppyDiskIcon} />
                {isEdit ? "Save changes" : "Create quotation"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSaved={(customer: Customer) => {
          void refreshCustomers();
          setValue("customer_id", customer.id, { shouldValidate: true });
        }}
      />
    </>
  );
}
