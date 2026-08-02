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
  is_active: true,
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

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues, unknown, ProductPayload>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            name: product.name,
            category: product.category ?? "",
            rate_type: product.rate_type,
            unit: product.unit,
            default_rate: Number(product.default_rate),
            gst_percent: Number(product.gst_percent),
            is_active: product.is_active,
          }
        : EMPTY,
    );
  }, [open, product, reset]);

  async function onSubmit(values: ProductPayload) {
    setSubmitting(true);
    try {
      const saved = await saveProduct(values, product?.id);
      toast.success(product ? "Product updated" : "Product added");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            Rate type decides whether the quotation builder asks for size or quantity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
            <Input
              id="name"
              placeholder="Star Flex"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="category" error={errors.category?.message}>
              <Input id="category" placeholder="Flex / Print" {...register("category")} />
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
                      // Keep the printed unit in step with the pricing model.
                      setValue("unit", value === "sqft" ? "sq.ft." : "piece");
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
              label="Default rate (₹)"
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
              {product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
