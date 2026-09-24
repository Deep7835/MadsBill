"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
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
import { updateStockSettings } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { stockUnit } from "@/lib/inventory";
import type { StockItem } from "@/lib/types/database";

/** Cost price, reorder level and whether invoices deduct this item. */
export function StockSettingsDialog({
  item,
  onOpenChange,
  onSaved,
}: {
  item: StockItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [cost, setCost] = useState("");
  const [reorder, setReorder] = useState("");
  const [track, setTrack] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setCost(String(item.cost_price ?? 0));
    setReorder(String(item.reorder_level ?? 0));
    setTrack(item.track_stock);
  }, [item]);

  if (!item) return null;
  const unit = stockUnit(item);
  const costValue = Number(cost || 0);
  const margin = Number(item.default_rate) - costValue;

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      await updateStockSettings(item.id, {
        cost_price: Math.max(0, costValue),
        reorder_level: Math.max(0, Number(reorder || 0)),
        track_stock: track,
      });
      toast.success(`${item.name} updated`);
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>Internal stock settings. None of this prints on bills.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <FormField label="Stock tracking" htmlFor="track">
            <Select value={track ? "yes" : "no"} onValueChange={(v) => setTrack(v === "yes")}>
              <SelectTrigger id="track">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Track stock (invoices deduct it)</SelectItem>
                <SelectItem value="no">Service — don&apos;t track</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label={`Cost price per ${unit}`}
            htmlFor="cost"
            hint={`Sale rate ${formatCurrency(item.default_rate)} · margin ${formatCurrency(margin)} per ${unit}`}
          >
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </FormField>

          <FormField
            label={`Reorder level (${unit})`}
            htmlFor="reorder"
            hint="The dashboard warns when stock falls to this. 0 turns the alert off."
          >
            <Input
              id="reorder"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={reorder}
              disabled={!track}
              onChange={(e) => setReorder(e.target.value)}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
