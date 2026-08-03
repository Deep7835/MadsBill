"use client";

import * as React from "react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isSameDay,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to: Date };
export type DatePreset = "today" | "7d" | "28d" | "month" | "custom";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "28d", label: "Last 28 Days" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "28d":
      return { from: startOfDay(subDays(now, 27)), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

function formatRangeLabel(range: DateRange, preset: DatePreset): string {
  if (preset !== "custom") {
    return PRESETS.find((p) => p.value === preset)?.label ?? "";
  }
  if (isSameDay(range.from, range.to)) {
    return format(range.from, "MMM d, yyyy");
  }
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
}

interface DateFilterProps {
  onChange?: (range: DateRange, preset: DatePreset) => void;
}

export function DateFilter({ onChange }: DateFilterProps) {
  const [preset, setPreset] = React.useState<DatePreset>("month");
  const [range, setRange] = React.useState<DateRange>(() => getPresetRange("month"));
  const [open, setOpen] = React.useState(false);

  // For custom range picking
  const [pickStart, setPickStart] = React.useState<Date | null>(null);
  const [pickEnd, setPickEnd] = React.useState<Date | null>(null);

  const handlePreset = (p: DatePreset) => {
    if (p === "custom") {
      setPreset("custom");
      setPickStart(range.from);
      setPickEnd(range.to);
      return;
    }
    const r = getPresetRange(p);
    setPreset(p);
    setRange(r);
    setOpen(false);
    onChange?.(r, p);
  };

  const handleCalendarSelect = (date: Date) => {
    if (!pickStart || (pickStart && pickEnd)) {
      // First click or resetting
      setPickStart(date);
      setPickEnd(null);
    } else {
      // Second click
      const from = date < pickStart ? date : pickStart;
      const to = date < pickStart ? pickStart : date;
      const r = { from: startOfDay(from), to: endOfDay(to) };
      setPickStart(from);
      setPickEnd(to);
      setRange(r);
      setPreset("custom");
      setOpen(false);
      onChange?.(r, "custom");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800",
          )}
        >
          <CalendarIcon className="size-3.5 text-slate-400" />
          <span>{formatRangeLabel(range, preset)}</span>
          <ChevronDown className="size-3 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto p-0 rounded-[5px] shadow-xl border-slate-200 dark:border-slate-700"
      >
        <div className="flex">
          {/* Presets List */}
          <div className="w-40 border-r border-slate-100 p-2 dark:border-slate-800">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Select
            </p>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePreset(p.value)}
                className={cn(
                  "flex w-full items-center rounded-[5px] px-2.5 py-2 text-xs font-medium transition-colors",
                  preset === p.value && p.value !== "custom"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar Panel — shows when custom is active */}
          {preset === "custom" && (
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex-1 rounded-[5px] bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {pickStart ? format(pickStart, "MMM d, yyyy") : "Start date"}
                </span>
                <span className="text-[10px] text-slate-400">→</span>
                <span className="flex-1 rounded-[5px] bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {pickEnd ? format(pickEnd, "MMM d, yyyy") : "End date"}
                </span>
              </div>
              <Calendar
                mode="range"
                rangeStart={pickStart}
                rangeEnd={pickEnd}
                onSelect={handleCalendarSelect}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
