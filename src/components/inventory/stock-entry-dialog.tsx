"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { SegmentedControl } from "@/components/shared/segmented-control";
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
import { createStockMovement } from "@/lib/queries";
import { formatCurrency, formatNumber, round2, toDateInput } from "@/lib/format";
import { stockUnit } from "@/lib/inventory";
import type { StockItem } from "@/lib/types/database";

export type EntryMode = "purchase" | "usage" | "wastage" | "adjustment" | "opening";

const MODES: { value: EntryMode; label: string }[] = [
  { value: "purchase", label: "Stock in" },
  { value: "usage", label: "Used" },
  { value: "wastage", label: "Wastage" },
  { value: "adjustment", label: "Stock count" },
  { value: "opening", label: "Opening" },
];

const HINT: Record<EntryMode, string> = {
  purchase: "Material bought from a supplier. Its rate becomes the item's cost price.",
  usage: "Material used on work that was not invoiced (samples, internal jobs).",
  wastage: "Offcuts, misprints and damaged stock.",
  adjustment: "Enter what is physically on the shelf; the difference is recorded.",
  opening: "Stock you already had before tracking started.",
};

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

export function StockEntryDialog({
  item,
  mode: initialMode,
  onOpenChange,
  onSaved,
}: {
  item: StockItem | null;
  mode: EntryMode;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<EntryMode>(initialMode);
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [roll, setRoll] = useState({ width: "", length: "", count: "1" });
  const [saving, setSaving] = useState(false);

  // Fresh form every time the dialog opens for an item.
  useEffect(() => {
    if (!item) return;
    setMode(initialMode);
    setQty("");
    setRate(item.cost_price ? String(item.cost_price) : "");
    setDate(toDateInput(new Date()));
    setSupplier("");
    setNote("");
    setRoll({ width: "", length: "", count: "1" });
  }, [item, initialMode]);

  if (!item) return null;

  const unit = stockUnit(item);
  const isSqft = item.rate_type === "sqft";
  const addsStock = mode === "purchase" || mode === "opening";
  const quantity = num(qty);
  const unitRate = num(rate);

  // Stock count records the difference, so the balance lands on what was counted.
  const change =
    mode === "adjustment" ? round2(quantity - item.on_hand) : addsStock ? quantity : -quantity;
  const valid =
    Number.isFinite(quantity) && (mode === "adjustment" ? quantity >= 0 && change !== 0 : quantity > 0);
  const after = round2(item.on_hand + (Number.isFinite(change) ? change : 0));

  function updateRoll(next: Partial<typeof roll>) {
    const merged = { ...roll, ...next };
    setRoll(merged);
    const area = num(merged.width) * num(merged.length) * (num(merged.count) || 1);
    if (Number.isFinite(area) && area > 0) setQty(String(round2(area)));
  }

  async function handleSave() {
    if (!item || !valid) return;
    setSaving(true);
    try {
      await createStockMovement({
        product_id: item.id,
        kind: mode,
        qty: round2(change),
        unit_cost: addsStock && Number.isFinite(unitRate) ? unitRate : null,
        date,
        supplier: mode === "purchase" ? supplier.trim() || null : null,
        note: note.trim() || null,
      });
      toast.success(`${item.name}: ${formatNumber(after)} ${unit} in stock`);
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save the stock entry", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            {formatNumber(item.on_hand)} {unit} in stock now
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-x-auto">
            <SegmentedControl value={mode} onChange={setMode} aria-label="Entry type" segments={MODES} />
          </div>
          <p className="text-xs text-muted-foreground">{HINT[mode]}</p>

          {isSqft && addsStock ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-dashed border-border p-3">
              <p className="col-span-3 text-xs font-medium text-muted-foreground">
                Roll size (optional) — fills the quantity
              </p>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Width ft"
                aria-label="Roll width in feet"
                value={roll.width}
                onChange={(e) => updateRoll({ width: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Length ft"
                aria-label="Roll length in feet"
                value={roll.length}
                onChange={(e) => updateRoll({ length: e.target.value })}
              />
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Rolls"
                aria-label="Number of rolls"
                value={roll.count}
                onChange={(e) => updateRoll({ count: e.target.value })}
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label={mode === "adjustment" ? `Counted (${unit})` : `Quantity (${unit})`}
              htmlFor="stock-qty"
              required
            >
              <Input
                id="stock-qty"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                autoFocus
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </FormField>
            <FormField label="Date" htmlFor="stock-date" required>
              <Input id="stock-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>

            {addsStock ? (
              <FormField label={`Cost per ${unit}`} htmlFor="stock-rate" hint="Internal only">
                <Input
                  id="stock-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </FormField>
            ) : null}
            {mode === "purchase" ? (
              <FormField label="Supplier" htmlFor="stock-supplier">
                <Input
                  id="stock-supplier"
                  placeholder="Supplier name / bill no."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </FormField>
            ) : null}

            <FormField label="Note" htmlFor="stock-note" className="sm:col-span-2">
              <Input
                id="stock-note"
                placeholder={mode === "wastage" ? "Misprint on job #…" : "Optional"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">
              {valid ? (
                <>
                  {change > 0 ? "+" : "−"}
                  {formatNumber(Math.abs(change))} {unit}
                  {addsStock && Number.isFinite(unitRate) && unitRate > 0
                    ? ` · ${formatCurrency(quantity * unitRate)}`
                    : ""}
                </>
              ) : (
                "Enter a quantity"
              )}
            </span>
            <span className="font-semibold tabular-nums">
              After: {formatNumber(after)} {unit}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid} loading={saving}>
            Save entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
