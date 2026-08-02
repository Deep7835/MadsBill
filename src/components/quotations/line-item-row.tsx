"use client";

import { Trash2 } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { calcLine } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types/database";
import type { QuotationFormValues } from "@/lib/validations/quotation";

interface LineItemRowProps {
  index: number;
  register: UseFormRegister<QuotationFormValues>;
  errors?: FieldErrors<QuotationFormValues>["items"];
  products: Product[];
  value: NonNullable<QuotationFormValues["items"]>[number];
  onProductChange: (index: number, productId: string) => void;
  onRemove: (index: number) => void;
  removable: boolean;
}

export function LineItemRow({
  index,
  register,
  errors,
  products,
  value,
  onProductChange,
  onRemove,
  removable,
}: LineItemRowProps) {
  const itemErrors = Array.isArray(errors) ? errors[index] : undefined;
  const isSqft = value?.rate_type === "sqft";
  const product = products.find((p) => p.id === value?.product_id);

  const { area, amount, rate, discount, slabThreshold } = calcLine({
    rate_type: isSqft ? "sqft" : "piece",
    width: value?.width,
    height: value?.height,
    qty: value?.qty,
    rate: value?.rate,
    gst_percent: value?.gst_percent,
    slabs: product,
  });

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.category || "Other";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const fieldError = (message?: string) =>
    message ? <p className="mt-1 text-xs font-medium text-destructive">{message}</p> : null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      {/* Index and remove sit on their own row so the fields get full width. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-1 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
          disabled={!removable}
          aria-label={`Remove line ${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>

      <div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Product */}
          <div className="lg:col-span-4">
            <Label className="text-xs text-muted-foreground">Product</Label>
            <Select
              value={value?.product_id ?? ""}
              onValueChange={(productId) => onProductChange(index, productId)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(grouped).map(([category, items]) => (
                  <SelectGroup key={category}>
                    <SelectLabel>{category}</SelectLabel>
                    {items.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="lg:col-span-8">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              className="mt-1"
              placeholder="Shop board – front side"
              aria-invalid={!!itemErrors?.description}
              {...register(`items.${index}.description` as const)}
            />
            {fieldError(itemErrors?.description?.message)}
          </div>

          {/* Measurements */}
          {isSqft ? (
            <>
              <div className="lg:col-span-2">
                <Label className="text-xs text-muted-foreground">Width (ft)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  aria-invalid={!!itemErrors?.width}
                  {...register(`items.${index}.width` as const)}
                />
                {fieldError(itemErrors?.width?.message)}
              </div>
              <div className="lg:col-span-2">
                <Label className="text-xs text-muted-foreground">Height (ft)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  aria-invalid={!!itemErrors?.height}
                  {...register(`items.${index}.height` as const)}
                />
                {fieldError(itemErrors?.height?.message)}
              </div>
              <div className="lg:col-span-2">
                <Label className="text-xs text-muted-foreground">Area (sq.ft.)</Label>
                <div className="mt-1 flex h-9 items-center rounded-lg border border-dashed border-border bg-muted/50 px-3 text-sm font-medium tabular-nums">
                  {formatNumber(area ?? 0)}
                </div>
              </div>
            </>
          ) : null}

          <div className={cn(isSqft ? "lg:col-span-2" : "lg:col-span-3")}>
            <Label className="text-xs text-muted-foreground">Qty</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              aria-invalid={!!itemErrors?.qty}
              {...register(`items.${index}.qty` as const)}
            />
            {fieldError(itemErrors?.qty?.message)}
          </div>

          <div className={cn(isSqft ? "lg:col-span-2" : "lg:col-span-3")}>
            <Label className="text-xs text-muted-foreground">
              Rate {isSqft ? "/ sq.ft." : "/ piece"}
            </Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              aria-invalid={!!itemErrors?.rate}
              {...register(`items.${index}.rate` as const)}
            />
            {fieldError(itemErrors?.rate?.message)}
            {discount > 0 ? (
              <p className="mt-1 text-xs font-medium text-[var(--success)]">
                {slabThreshold}+ sq.ft. → {formatCurrency(rate)}
              </p>
            ) : null}
          </div>

          <div className={cn(isSqft ? "lg:col-span-2" : "lg:col-span-3")}>
            <Label className="text-xs text-muted-foreground">GST %</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              aria-invalid={!!itemErrors?.gst_percent}
              {...register(`items.${index}.gst_percent` as const)}
            />
            {fieldError(itemErrors?.gst_percent?.message)}
          </div>

          <div className={cn("flex flex-col justify-end", isSqft ? "lg:col-span-2" : "lg:col-span-3")}>
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <div className="mt-1 flex h-9 items-center justify-end rounded-lg bg-primary/5 px-3 text-sm font-semibold tabular-nums text-primary">
              {formatCurrency(amount)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
