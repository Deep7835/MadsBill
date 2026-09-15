"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import type { ActivityDay } from "@/lib/queries";
import { cn } from "@/lib/utils";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
] as const;

type Days = (typeof RANGES)[number]["days"];

interface Bar {
  key: string;
  label: string;
  /** Full date for the hover title. */
  title: string;
  total: number;
  count: number;
}

/**
 * Invoiced revenue per day for the chosen window, compared against the
 * window immediately before it. Bars are plain divs on a grey track, so the
 * chart needs no library and inherits the theme.
 */
export function RevenueChart({ activity }: { activity: ActivityDay[] }) {
  const [days, setDays] = useState<Days>(7);

  const { bars, current, previous, max } = useMemo(() => {
    const byDate = new Map(activity.map((d) => [d.date, d]));
    const today = new Date();

    const sumWindow = (offset: number) => {
      let sum = 0;
      for (let i = 0; i < days; i++) {
        sum += byDate.get(format(subDays(today, offset + i), "yyyy-MM-dd"))?.total ?? 0;
      }
      return sum;
    };

    const bars: Bar[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const day = byDate.get(format(date, "yyyy-MM-dd"));
      bars.push({
        key: format(date, "yyyy-MM-dd"),
        label: days === 7 ? format(date, "EEE") : format(date, "d"),
        title: format(date, "EEE, d MMM"),
        total: day?.total ?? 0,
        count: day?.count ?? 0,
      });
    }

    return {
      bars,
      current: sumWindow(0),
      previous: sumWindow(days),
      max: Math.max(1, ...bars.map((b) => b.total)),
    };
  }, [activity, days]);

  const change = previous > 0 ? ((current - previous) / previous) * 100 : null;
  const up = (change ?? 0) >= 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[26px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">
            {formatCurrency(current)}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Last {days} days vs previous {days} days
            {change !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal",
                  up
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
                )}
              >
                {up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {up ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            ) : null}
          </p>
        </div>

        {/* Range toggle */}
        <div
          role="group"
          aria-label="Chart range"
          className="inline-flex rounded-[10px] border border-slate-200 p-0.5 dark:border-slate-700"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors",
                days === range.days
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="mt-6">
        <div className={cn("flex h-44 items-end", days === 7 ? "gap-3 sm:gap-5" : "gap-1 sm:gap-1.5")}>
          {bars.map((bar) => (
            <div
              key={bar.key}
              title={
                bar.count
                  ? `${bar.title} · ${formatCurrency(bar.total)} · ${bar.count} invoice${bar.count === 1 ? "" : "s"}`
                  : `${bar.title} · no invoices`
              }
              className="relative h-full min-w-0 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-md bg-indigo-500 transition-[height] duration-300 dark:bg-indigo-400"
                style={{ height: `${(bar.total / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className={cn("mt-2.5 flex", days === 7 ? "gap-3 sm:gap-5" : "gap-1 sm:gap-1.5")}>
          {bars.map((bar, i) => (
            <span
              key={bar.key}
              className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-500 dark:text-slate-400"
            >
              {days === 7 || i % 5 === 0 || i === bars.length - 1 ? bar.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
