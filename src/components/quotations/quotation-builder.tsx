"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
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
import { calcLine, calcTotals } from "@/lib/calc";
import { addDays, formatCurrency, toDateInput } from "@/lib/format";
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
        rate: Number(item.rate),
        gst_percent: Number(item.gst_percent),
      })),
    };
  }

  return {
    customer_id: presetCustomerId ?? "",
    date: toDateInput(new Date()),
    valid_until: toDateInput(addDays(new Date(), 15)),
    status: "quotation",
    payment_status: "unpaid",
    notes: "",
    items: [blankItem()],
  };
}

interface QuotationBuilderProps {
  quotation?: QuotationFull;
  presetCustomerId?: string;
}

export function QuotationBuilder({ quotation, presetCustomerId }: QuotationBuilderProps) {
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

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const items = useMemo(() => (watchedItems ?? []) as ItemValues[], [watchedItems]);

  const totals = useMemo(
    () =>
      calcTotals(
        items.map((item) => ({
          rate_type: item?.rate_type === "piece" ? "piece" : "sqft",
          width: item?.width,
          height: item?.height,
          qty: item?.qty,
          rate: item?.rate,
          gst_percent: item?.gst_percent,
        })),
      ),
    [items],
  );

  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.is_active),
    [products],
  );

  /** Picking a product pre-fills description, rate type, rate and GST. */
  function handleProductChange(index: number, productId: string) {
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
        const { area, amount } = calcLine(item);
        return {
          product_id: item.product_id ?? null,
          description: item.description,
          rate_type: item.rate_type,
          width: item.rate_type === "sqft" ? (item.width ?? null) : null,
          height: item.rate_type === "sqft" ? (item.height ?? null) : null,
          area,
          qty: item.qty,
          rate: item.rate,
          gst_percent: item.gst_percent,
          amount,
        };
      });

      const computed = calcTotals(values.items);
      const payload = {
        quotation: {
          customer_id: values.customer_id,
          date: values.date,
          valid_until: values.valid_until,
          status: values.status,
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
          <ArrowLeft />
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
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <UserPlus />
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

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append(blankItem())}>
              <Plus />
              Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  errors={errors.items}
                  products={activeProducts}
                  value={items[index] ?? blankItem()}
                  onProductChange={handleProductChange}
                  onRemove={remove}
                  removable={fields.length > 1}
                />
              ))
            )}

            {errors.items?.message ? (
              <p className="text-xs font-medium text-destructive">{errors.items.message}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
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

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="font-medium tabular-nums">{formatCurrency(totals.gstAmount)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Grand total</span>
                <span className="text-xl font-semibold tabular-nums text-primary">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>

              <Button type="submit" className="mt-4 w-full" loading={submitting}>
                <Save />
                {isEdit ? "Save changes" : "Create quotation"}
              </Button>
            </CardContent>
          </Card>
        </div>
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
