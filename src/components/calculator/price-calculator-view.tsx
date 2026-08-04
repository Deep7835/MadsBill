"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalculatorIcon,
  Invoice01Icon,
  Add01Icon,
  ReceiptTextIcon,
  RotateLeft01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchProducts } from "@/lib/queries";
import { calcLine, calcTotals, type CalcLine } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/format";
import { stashDraftItems, type DraftItem } from "@/lib/draft";
import type { Product, RateType } from "@/lib/types/database";

interface Row {
  key: string;
  productId: string | null;
  description: string;
  rateType: RateType;
  width: string;
  height: string;
  qty: string;
  rate: string;
  gstPercent: string;
}

let rowSeq = 0;

const newRow = (): Row => ({
  // Plain counter, not randomUUID — the key must not differ between the
  // server and client render.
  key: `row-${++rowSeq}`,
  productId: null,
  description: "",
  rateType: "sqft",
  width: "",
  height: "",
  qty: "1",
  rate: "",
  gstPercent: "18",
});

export function PriceCalculatorView() {
  const router = useRouter();
  const { data: products, loading } = useAsyncData(fetchProducts, [], {
    errorMessage: "Could not load products",
  });

  const [rows, setRows] = useState<Row[]>([newRow()]);

  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.is_active),
    [products],
  );
  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );

  const grouped = useMemo(
    () =>
      activeProducts.reduce<Record<string, Product[]>>((acc, p) => {
        const key = p.category || "Other";
        (acc[key] ??= []).push(p);
        return acc;
      }, {}),
    [activeProducts],
  );

  const toCalcLine = (row: Row): CalcLine => ({
    rate_type: row.rateType,
    width: row.width,
    height: row.height,
    qty: row.qty,
    rate: row.rate,
    gst_percent: row.gstPercent,
    slabs: row.productId ? (productById.get(row.productId) ?? null) : null,
  });

  const totals = useMemo(
    () => calcTotals(rows.map(toCalcLine)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, productById],
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function pickProduct(key: string, productId: string) {
    const product = productById.get(productId);
    if (!product) return;
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              productId: product.id,
              rateType: product.rate_type,
              rate: String(Number(product.default_rate)),
              gstPercent: String(Number(product.gst_percent)),
              description: row.description || product.name,
            }
          : row,
      ),
    );
  }

  const hasPricedLine = rows.some((row) => calcLine(toCalcLine(row)).amount > 0);

  function handOff(as: "quotation" | "invoice") {
    const items: DraftItem[] = rows
      .filter((row) => calcLine(toCalcLine(row)).amount > 0)
      .map((row) => ({
        product_id: row.productId,
        description:
          row.description.trim() ||
          (row.productId ? (productById.get(row.productId)?.name ?? "Item") : "Item"),
        rate_type: row.rateType,
        width: row.rateType === "sqft" ? row.width : "",
        height: row.rateType === "sqft" ? row.height : "",
        qty: row.qty,
        rate: row.rate,
        gst_percent: row.gstPercent,
      }));

    if (!items.length) {
      toast.error("Nothing to carry over", { description: "Price at least one line first." });
      return;
    }

    stashDraftItems(items);
    router.push(`/quotations/new?draft=1${as === "invoice" ? "&as=invoice" : ""}`);
  }

  return (
    <>
      <PageHeader
        title="Price calculator"
        description="Quote a price on the spot — no customer needed. Carry it into a quotation or invoice once they agree."
      >
        <Button variant="outline" onClick={() => setRows([newRow()])}>
          <HugeiconsIcon icon={RotateLeft01Icon} />
          Reset
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {loading ? (
            <>
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </>
          ) : (
            rows.map((row, index) => {
              const result = calcLine(toCalcLine(row));
              const isSqft = row.rateType === "sqft";

              return (
                <Card key={row.key}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <Select
                          value={row.rateType}
                          onValueChange={(value) =>
                            update(row.key, { rateType: value as RateType, productId: null })
                          }
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sqft">Per sq.ft.</SelectItem>
                            <SelectItem value="piece">Per piece</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setRows((current) => current.filter((r) => r.key !== row.key))
                          }
                          disabled={rows.length === 1}
                          aria-label={`Remove line ${index + 1}`}
                        >
                          <HugeiconsIcon icon={Delete02Icon} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-5">
                        <Label className="text-xs text-muted-foreground">Product</Label>
                        <Select
                          value={row.productId ?? ""}
                          onValueChange={(id) => pickProduct(row.key, id)}
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

                      <div className="lg:col-span-7">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input
                          className="mt-1"
                          placeholder="Shop board – front side"
                          value={row.description}
                          onChange={(e) => update(row.key, { description: e.target.value })}
                        />
                      </div>

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
                              value={row.width}
                              onChange={(e) => update(row.key, { width: e.target.value })}
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <Label className="text-xs text-muted-foreground">Height (ft)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              step="0.01"
                              min="0"
                              inputMode="decimal"
                              value={row.height}
                              onChange={(e) => update(row.key, { height: e.target.value })}
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <Label className="text-xs text-muted-foreground">Area</Label>
                            <div className="mt-1 flex h-9 items-center rounded-lg border border-dashed border-border bg-muted/50 px-3 text-sm font-medium tabular-nums">
                              {formatNumber(result.area ?? 0)}
                            </div>
                          </div>
                        </>
                      ) : null}

                      <div className={isSqft ? "lg:col-span-2" : "lg:col-span-4"}>
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          value={row.qty}
                          onChange={(e) => update(row.key, { qty: e.target.value })}
                        />
                      </div>

                      {/* Read-only: the product master owns rate and GST. */}
                      <div className={isSqft ? "lg:col-span-2" : "lg:col-span-4"}>
                        <Label className="text-xs text-muted-foreground">
                          Rate {isSqft ? "/ sq.ft." : "/ piece"}
                        </Label>
                        <div
                          title="Set in Products & Rates"
                          className="mt-1 flex h-9 items-center rounded-lg border border-dashed border-border bg-muted/50 px-3 text-sm font-medium tabular-nums"
                        >
                          {formatCurrency(result.rate)}
                        </div>
                        {result.discount > 0 ? (
                          <p className="mt-1 text-xs font-medium text-[var(--success)]">
                            {result.slabThreshold}+ sq.ft. slab applied
                          </p>
                        ) : null}
                      </div>

                      <div className={isSqft ? "lg:col-span-2" : "lg:col-span-4"}>
                        <Label className="text-xs text-muted-foreground">GST %</Label>
                        <div
                          title="Set in Products & Rates"
                          className="mt-1 flex h-9 items-center rounded-lg border border-dashed border-border bg-muted/50 px-3 text-sm font-medium tabular-nums"
                        >
                          {formatNumber(Number(row.gstPercent || 0))}%
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {isSqft && result.area ? (
                          <Badge variant="secondary">{formatNumber(result.area)} sq.ft. / piece</Badge>
                        ) : null}
                        {result.discount > 0 ? (
                          <Badge variant="success">
                            Volume rate −{formatCurrency(result.discount)}/sq.ft.
                          </Badge>
                        ) : null}
                        <span>+ GST {formatCurrency(result.gstAmount)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Line total incl. GST</p>
                        <p className="text-lg font-semibold tabular-nums text-primary">
                          {formatCurrency(result.total)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setRows((current) => [...current, newRow()])}
          >
            <HugeiconsIcon icon={Add01Icon} />
            Add another item
          </Button>
        </div>

        <Card className="lg:sticky lg:top-20 lg:h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={CalculatorIcon} className="size-4 text-primary" />
              Quote
            </CardTitle>
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
            {totals.savings > 0 ? (
              <div className="flex justify-between text-[var(--success)]">
                <span>Volume discount</span>
                <span className="font-medium tabular-nums">−{formatCurrency(totals.savings)}</span>
              </div>
            ) : null}

            <Separator className="my-2" />

            <div className="flex items-baseline justify-between">
              <span className="font-medium">Grand total</span>
              <span className="text-2xl font-semibold tabular-nums text-primary">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>

            <p className="pt-2 text-xs text-muted-foreground">
              Nothing is saved until you create a document.
            </p>

            <div className="grid gap-2 pt-2">
              <Button onClick={() => handOff("quotation")} disabled={!hasPricedLine}>
                <HugeiconsIcon icon={Invoice01Icon} />
                Create quotation
              </Button>
              <Button
                variant="outline"
                onClick={() => handOff("invoice")}
                disabled={!hasPricedLine}
              >
                <HugeiconsIcon icon={ReceiptTextIcon} />
                Create invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
