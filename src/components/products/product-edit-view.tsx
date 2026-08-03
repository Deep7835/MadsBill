"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  PackageIcon,
  Tag01Icon,
  PercentIcon,
  Tick01Icon,
  Cancel01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchProduct, saveProduct } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import {
  productSchema,
  type ProductFormValues,
  type ProductPayload,
} from "@/lib/validations/product";

interface ProductEditViewProps {
  productId: string;
}

export function ProductEditView({ productId }: ProductEditViewProps) {
  const router = useRouter();
  const { data: product, loading } = useAsyncData(
    () => fetchProduct(productId),
    [productId],
    { errorMessage: "Could not load product" },
  );

  const [submitting, setSubmitting] = useState(false);
  const [changeReason, setChangeReason] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues, unknown, ProductPayload>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      rate_type: "sqft",
      unit: "sq.ft.",
      default_rate: 0,
      gst_percent: 18,
      is_active: true,
      slab1_min_area: 500,
      slab1_discount: 2,
      slab2_min_area: 1000,
      slab2_discount: 4,
    },
  });

  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      category: product.category ?? "",
      rate_type: product.rate_type,
      unit: product.unit,
      default_rate: Number(product.default_rate),
      gst_percent: Number(product.gst_percent),
      is_active: product.is_active,
      slab1_min_area: product.slab1_min_area ?? "",
      slab1_discount: Number(product.slab1_discount ?? 0),
      slab2_min_area: product.slab2_min_area ?? "",
      slab2_discount: Number(product.slab2_discount ?? 0),
    });
  }, [product, reset]);

  async function onSubmit(values: ProductPayload) {
    setSubmitting(true);
    try {
      await saveProduct(values, productId, changeReason || "Admin rate card update");
      toast.success("Product & Rate Slabs updated");
      router.push("/products");
    } catch (err) {
      toast.error("Could not save product", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isSqft = watch("rate_type") === "sqft";
  const baseRate = Number(watch("default_rate")) || 0;
  const slab1 = {
    area: Number(watch("slab1_min_area")) || 0,
    off: Number(watch("slab1_discount")) || 0,
  };
  const slab2 = {
    area: Number(watch("slab2_min_area")) || 0,
    off: Number(watch("slab2_discount")) || 0,
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <HugeiconsIcon icon={PackageIcon} className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Product not found</h2>
        <p className="text-sm text-muted-foreground mt-1">This product may have been deleted.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/products")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 mr-1" />
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ───── Page header ───── */}
      <PageHeader
        title={`Edit — ${product.name}`}
        description="Update product details, pricing, and volume rate slabs."
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
            disabled={submitting}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!isDirty && !changeReason}>
            <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </PageHeader>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* ═══════════════════════════════════════ Left Column: Product Info ═══════════════════ */}
        <div className="space-y-5">
          {/* ── Basic Details card ── */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <HugeiconsIcon icon={PackageIcon} className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Product Details</h2>
                  <p className="text-xs text-muted-foreground">Name, category, and status</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <FormField label="Product Name" htmlFor="name" error={errors.name?.message} required>
                  <Input
                    id="name"
                    placeholder="Star Flex 220 GSM"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Category" htmlFor="category" error={errors.category?.message}>
                    <Input id="category" placeholder="Flex / Vinyl / Banner" {...register("category")} />
                  </FormField>

                  <FormField label="Status" htmlFor="is_active">
                    <Controller
                      control={control}
                      name="is_active"
                      render={({ field }) => (
                        <Select
                          value={field.value ? "active" : "inactive"}
                          onValueChange={(value) => field.onChange(value === "active")}
                        >
                          <SelectTrigger id="is_active">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Rate Type" error={errors.rate_type?.message} required>
                    <Controller
                      control={control}
                      name="rate_type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const sqft = value === "sqft";
                            setValue("unit", sqft ? "sq.ft." : "piece");
                            setValue("slab1_min_area", sqft ? 500 : "");
                            setValue("slab1_discount", sqft ? 2 : 0);
                            setValue("slab2_min_area", sqft ? 1000 : "");
                            setValue("slab2_discount", sqft ? 4 : 0);
                          }}
                        >
                          <SelectTrigger aria-invalid={!!errors.rate_type}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sqft">Per sq.ft. (width × height)</SelectItem>
                            <SelectItem value="piece">Per piece (quantity)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Unit Label" htmlFor="unit" error={errors.unit?.message} required>
                    <Input id="unit" placeholder="sq.ft." {...register("unit")} />
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Change reason card ── */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <HugeiconsIcon icon={InformationCircleIcon} className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Change Log</h2>
                  <p className="text-xs text-muted-foreground">Reason for this rate update (optional)</p>
                </div>
              </div>
              <div className="p-5">
                <FormField label="Reason for Rate Change" htmlFor="change_reason">
                  <Input
                    id="change_reason"
                    placeholder="e.g. Raw material price reduction / Supplier discount"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════ Right Column: Pricing ═══════════════════════ */}
        <div className="space-y-5">
          {/* ── Pricing card ── */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <HugeiconsIcon icon={Tag01Icon} className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Pricing</h2>
                  <p className="text-xs text-muted-foreground">Base rate and tax configuration</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Default Base Rate (₹)"
                    htmlFor="default_rate"
                    error={errors.default_rate?.message}
                    required
                  >
                    <Input
                      id="default_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      aria-invalid={!!errors.default_rate}
                      {...register("default_rate")}
                    />
                  </FormField>

                  <FormField
                    label="GST %"
                    htmlFor="gst_percent"
                    error={errors.gst_percent?.message}
                    required
                  >
                    <Input
                      id="gst_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      aria-invalid={!!errors.gst_percent}
                      {...register("gst_percent")}
                    />
                  </FormField>
                </div>

                {/* Live price preview */}
                <div className="rounded-xl bg-muted/50 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Price Preview</p>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(baseRate)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /{watch("unit") || "unit"}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      +{Number(watch("gst_percent")) || 0}% GST
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Volume Slabs card ── */}
          {isSqft ? (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <HugeiconsIcon icon={PercentIcon} className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Volume Rate Slabs</h2>
                    <p className="text-xs text-muted-foreground">
                      Lower per sq.ft. rates for larger piece sizes
                    </p>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  {/* Slab 1 */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        1
                      </span>
                      <span className="text-sm font-medium text-foreground">Slab 1</span>
                      {slab1.area && slab1.off ? (
                        <Badge variant="secondary" className="ml-auto text-xs font-mono">
                          {formatCurrency(Math.max(0, baseRate - slab1.off))}/sq.ft.
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        label="Min Area (sq.ft.)"
                        htmlFor="slab1_min_area"
                        error={errors.slab1_min_area?.message}
                      >
                        <Input
                          id="slab1_min_area"
                          type="number"
                          step="1"
                          min="0"
                          placeholder="500"
                          {...register("slab1_min_area")}
                        />
                      </FormField>
                      <FormField
                        label="Rate Discount (₹)"
                        htmlFor="slab1_discount"
                        error={errors.slab1_discount?.message}
                      >
                        <Input
                          id="slab1_discount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="2"
                          {...register("slab1_discount")}
                        />
                      </FormField>
                    </div>
                  </div>

                  {/* Slab 2 */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        2
                      </span>
                      <span className="text-sm font-medium text-foreground">Slab 2</span>
                      {slab2.area && slab2.off ? (
                        <Badge variant="secondary" className="ml-auto text-xs font-mono">
                          {formatCurrency(Math.max(0, baseRate - slab2.off))}/sq.ft.
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        label="Min Area (sq.ft.)"
                        htmlFor="slab2_min_area"
                        error={errors.slab2_min_area?.message}
                      >
                        <Input
                          id="slab2_min_area"
                          type="number"
                          step="1"
                          min="0"
                          placeholder="1000"
                          {...register("slab2_min_area")}
                        />
                      </FormField>
                      <FormField
                        label="Rate Discount (₹)"
                        htmlFor="slab2_discount"
                        error={errors.slab2_discount?.message}
                      >
                        <Input
                          id="slab2_discount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="4"
                          {...register("slab2_discount")}
                        />
                      </FormField>
                    </div>
                  </div>

                  {/* Slab summary strip */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs font-medium">
                    <span className="text-foreground">
                      Standard: <span className="font-bold">{formatCurrency(baseRate)}</span>
                    </span>
                    {slab1.area && slab1.off ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {slab1.area}+ sq.ft:{" "}
                        <span className="font-bold">
                          {formatCurrency(Math.max(0, baseRate - slab1.off))}
                        </span>{" "}
                        (-₹{slab1.off})
                      </span>
                    ) : null}
                    {slab2.area && slab2.off ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {slab2.area}+ sq.ft:{" "}
                        <span className="font-bold">
                          {formatCurrency(Math.max(0, baseRate - slab2.off))}
                        </span>{" "}
                        (-₹{slab2.off})
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </form>
  );
}
