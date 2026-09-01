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
import { formatCurrency } from "@/lib/format";
import {
  productSchema,
  type ProductFormValues,
  type ProductPayload,
} from "@/lib/validations/product";
import { saveProduct } from "@/lib/queries";
import type { Product } from "@/lib/types/database";

const EMPTY: ProductFormValues = {
  name: "",
  category: "",
  rate_type: "sqft",
  unit: "sq.ft.",
  default_rate: 0,
  gst_percent: 18,
  hsn_code: "",
  is_active: true,
  slab1_min_area: 500,
  slab1_discount: 2,
  slab2_min_area: 1000,
  slab2_discount: 4,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: (product: Product) => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [changeReason, setChangeReason] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues, unknown, ProductPayload>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    setChangeReason("");
    reset(
      product
        ? {
            name: product.name,
            category: product.category ?? "",
            rate_type: product.rate_type,
            unit: product.unit,
            default_rate: Number(product.default_rate),
            gst_percent: Number(product.gst_percent),
            hsn_code: product.hsn_code ?? "",
            is_active: product.is_active,
            slab1_min_area: product.slab1_min_area ?? "",
            slab1_discount: Number(product.slab1_discount ?? 0),
            slab2_min_area: product.slab2_min_area ?? "",
            slab2_discount: Number(product.slab2_discount ?? 0),
          }
        : EMPTY,
    );
  }, [open, product, reset]);

  async function onSubmit(values: ProductPayload) {
    setSubmitting(true);
    try {
      const saved = await saveProduct(values, product?.id, changeReason || "Admin rate card update");
      toast.success(product ? "Product & Rate Slabs updated" : "Product added");
      onSaved(saved);
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Rate Slab & Product" : "New Rate Card Product"}</DialogTitle>
          <DialogDescription>
            Admin rate management. Adjust base per sq.ft. rates and volume discount slabs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
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

            <FormField label="Rate type" error={errors.rate_type?.message} required>
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

            <FormField label="Unit" htmlFor="unit" error={errors.unit?.message} required>
              <Input id="unit" placeholder="sq.ft." {...register("unit")} />
            </FormField>

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

            <FormField
              label="HSN / SAC Code"
              htmlFor="hsn_code"
              error={errors.hsn_code?.message}
              hint="Overrides default HSN"
            >
              <Input
                id="hsn_code"
                inputMode="numeric"
                placeholder="e.g. 998912"
                {...register("hsn_code")}
              />
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

          {isSqft ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Volume Rate Slabs</p>
                <p className="text-xs text-muted-foreground">
                  Configure lower per sq.ft. rates when single piece size exceeds slab thresholds.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Slab 1 — Min Area (sq.ft.)"
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
                  label="Slab 1 — Rate Discount (₹)"
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

                <FormField
                  label="Slab 2 — Min Area (sq.ft.)"
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
                  label="Slab 2 — Rate Discount (₹)"
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

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground pt-1 border-t">
                <span>Standard: {formatCurrency(baseRate)}</span>
                {slab1.area && slab1.off ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {slab1.area}+ sq.ft: {formatCurrency(Math.max(0, baseRate - slab1.off))} (-₹{slab1.off})
                  </span>
                ) : null}
                {slab2.area && slab2.off ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {slab2.area}+ sq.ft: {formatCurrency(Math.max(0, baseRate - slab2.off))} (-₹{slab2.off})
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {product ? (
            <FormField label="Reason for Rate Change (Optional Log)" htmlFor="change_reason">
              <Input
                id="change_reason"
                placeholder="e.g. Raw material price reduction / Supplier discount"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </FormField>
          ) : null}

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
              {product ? "Save Rate Slabs" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
