"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalculatorIcon,
  Exchange01Icon,
  Tick01Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type UnitType = "cm" | "inch" | "ft";

interface UnitConverterProps {
  onApply?: (widthFt: number, heightFt: number) => void;
  triggerLabel?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

// Conversion rates to Feet (the standard unit for area pricing in advertising/flex printing)
const TO_FEET: Record<UnitType, number> = {
  ft: 1,
  inch: 1 / 12,
  cm: 1 / 30.48,
};

const TO_CM: Record<UnitType, number> = {
  cm: 1,
  inch: 2.54,
  ft: 30.48,
};

const TO_INCH: Record<UnitType, number> = {
  inch: 1,
  cm: 1 / 2.54,
  ft: 12,
};

export function convertValue(val: number, from: UnitType, to: UnitType): number {
  if (isNaN(val) || val <= 0) return 0;
  if (from === to) return val;

  if (to === "ft") return val * TO_FEET[from];
  if (to === "cm") return val * TO_CM[from];
  if (to === "inch") return val * TO_INCH[from];
  return val;
}

export function UnitConverter({
  onApply,
  triggerLabel = "Unit Converter",
  variant = "outline",
  size = "sm",
}: UnitConverterProps) {
  const [open, setOpen] = useState(false);
  const [inputUnit, setInputUnit] = useState<UnitType>("cm");
  const [widthInput, setWidthInput] = useState<string>("100");
  const [heightInput, setHeightInput] = useState<string>("50");
  const [copied, setCopied] = useState(false);

  const wNum = parseFloat(widthInput) || 0;
  const hNum = parseFloat(heightInput) || 0;

  // Conversions
  const widthInches = convertValue(wNum, inputUnit, "inch");
  const heightInches = convertValue(hNum, inputUnit, "inch");

  const widthCm = convertValue(wNum, inputUnit, "cm");
  const heightCm = convertValue(hNum, inputUnit, "cm");

  const widthFt = convertValue(wNum, inputUnit, "ft");
  const heightFt = convertValue(hNum, inputUnit, "ft");

  const areaSqFt = widthFt * heightFt;

  function handleApply() {
    if (onApply) {
      onApply(Number(widthFt.toFixed(2)), Number(heightFt.toFixed(2)));
      toast.success(`Applied ${widthFt.toFixed(2)} ft × ${heightFt.toFixed(2)} ft (${areaSqFt.toFixed(2)} sq.ft)`);
    }
    setOpen(false);
  }

  function handleCopySummary() {
    const summary = `${wNum} ${inputUnit} × ${hNum} ${inputUnit} = ${widthFt.toFixed(2)} ft × ${heightFt.toFixed(2)} ft (${areaSqFt.toFixed(2)} sq.ft)`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Conversion copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} type="button" className="gap-1.5 font-medium shadow-2xs">
          <HugeiconsIcon icon={CalculatorIcon} className="h-3.5 w-3.5 text-primary" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <HugeiconsIcon icon={Exchange01Icon} className="h-5 w-5" />
            Measurement Converter
          </DialogTitle>
          <DialogDescription>
            Enter dimensions in CM, Inches, or Feet. Automatically converts to Feet &amp; calculates area for billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Unit selector */}
          <div className="space-y-1.5">
            <Label htmlFor="input-unit" className="text-xs font-semibold">
              Input Unit
            </Label>
            <Select value={inputUnit} onValueChange={(v) => setInputUnit(v as UnitType)}>
              <SelectTrigger id="input-unit" className="w-full">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cm">Centimeters (CM)</SelectItem>
                <SelectItem value="inch">Inches (Inches)</SelectItem>
                <SelectItem value="ft">Feet (Ft)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Width and Height Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="conv-width" className="text-xs font-semibold">
                Width ({inputUnit.toUpperCase()})
              </Label>
              <Input
                id="conv-width"
                type="number"
                step="any"
                min="0"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                placeholder="e.g. 120"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conv-height" className="text-xs font-semibold">
                Height ({inputUnit.toUpperCase()})
              </Label>
              <Input
                id="conv-height"
                type="number"
                step="any"
                min="0"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                placeholder="e.g. 60"
              />
            </div>
          </div>

          {/* Realtime Converted Values */}
          <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Converted Output Values
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded border bg-background p-2">
                <div className="text-muted-foreground font-medium">In Feet (ft)</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {widthFt.toFixed(2)} × {heightFt.toFixed(2)}
                </div>
              </div>
              <div className="rounded border bg-background p-2">
                <div className="text-muted-foreground font-medium">In Inches (in)</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {widthInches.toFixed(1)} × {heightInches.toFixed(1)}
                </div>
              </div>
              <div className="rounded border bg-background p-2">
                <div className="text-muted-foreground font-medium">In CM</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {widthCm.toFixed(1)} × {heightCm.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t text-sm font-semibold">
              <span>Total Calculated Area:</span>
              <span className="text-base font-extrabold text-primary">{areaSqFt.toFixed(2)} sq.ft</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={handleCopySummary}>
            {copied ? <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4 text-emerald-600 mr-1" /> : <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy Summary"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {onApply && (
              <Button size="sm" type="button" onClick={handleApply}>
                Apply to Item
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
