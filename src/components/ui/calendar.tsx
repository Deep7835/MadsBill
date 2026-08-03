"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onSelect?: (date: Date) => void;
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function Calendar({
  mode = "single",
  selected,
  rangeStart,
  rangeEnd,
  onSelect,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected ?? rangeStart ?? new Date()
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart); // Sunday
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handlePrev = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNext = () => setCurrentMonth(addMonths(currentMonth, 1));

  const isInRange = (d: Date) => {
    if (mode !== "range" || !rangeStart || !rangeEnd) return false;
    const start = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    const end = isAfter(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    return isWithinInterval(d, { start, end });
  };

  const isRangeEdge = (d: Date) => {
    if (mode !== "range") return false;
    return (rangeStart && isSameDay(d, rangeStart)) || (rangeEnd && isSameDay(d, rangeEnd));
  };

  return (
    <div className={cn("w-[280px] select-none", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={handlePrev}
          className="flex size-7 items-center justify-center rounded-[5px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="flex size-7 items-center justify-center rounded-[5px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="flex h-8 items-center justify-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((d, idx) => {
          const inMonth = isSameMonth(d, monthStart);
          const isSelected = selected && isSameDay(d, selected);
          const inRange = isInRange(d);
          const isEdge = isRangeEdge(d);
          const isToday = isSameDay(d, new Date());

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect?.(d)}
              className={cn(
                "relative flex h-8 items-center justify-center text-xs font-medium transition-colors",
                !inMonth && "text-slate-300 dark:text-slate-700",
                inMonth && !isSelected && !isEdge && "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                isToday && !isSelected && !isEdge && "font-bold text-indigo-600 dark:text-indigo-400",
                (isSelected || isEdge) &&
                  "rounded-[5px] bg-indigo-600 font-bold text-white dark:bg-indigo-500",
                inRange && !isEdge && "bg-indigo-50 dark:bg-indigo-950/40",
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
