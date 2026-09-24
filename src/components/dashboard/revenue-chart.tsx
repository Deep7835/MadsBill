"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

import { SegmentedControl } from "@/components/shared/segmented-control";
import { formatCurrency } from "@/lib/format";
import type { ActivityDay } from "@/lib/queries";
import { cn } from "@/lib/utils";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
] as const;

type Days = (typeof RANGES)[number]["days"];

/** Axis labels: ₹12K, ₹1.5L — short enough for a 48px gutter. */
const compact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

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

  const axis = [max, max / 2, 0];
  const gap = days === 7 ? "gap-3 sm:gap-5" : "gap-1 sm:gap-1.5";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[22px] font-semibold leading-7 tracking-tight tabular-nums text-foreground">
            {formatCurrency(current)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Last {days} days vs the {days} before
            {change !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
                  up ? "text-[var(--success)]" : "text-destructive",
                )}
              >
                {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {up ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            ) : null}
          </p>
        </div>

        <SegmentedControl
          value={String(days)}
          onChange={(v) => setDays(Number(v) as Days)}
          aria-label="Chart range"
          segments={RANGES.map((r) => ({ value: String(r.days), label: r.label }))}
        />
      </div>

      {/* Bars on light gridlines, with the scale on the left. */}
      <div className="mt-5 flex gap-2">
        <div className="flex h-36 w-11 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-muted-foreground" aria-hidden="true">
          {axis.map((v, i) => (
            <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {v === 0 ? "0" : compact.format(v)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-36">
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              {axis.map((_, i) => (
                <div key={i} className={cn("border-t", i === axis.length - 1 ? "border-border" : "border-dashed border-border/70")} />
              ))}
            </div>

            <div className={cn("relative flex h-full items-end", gap)}>
              {bars.map((bar) => {
                const pct = (bar.total / max) * 100;
                return (
                  <div
                    key={bar.key}
                    role="img"
                    aria-label={
                      bar.count
                        ? `${bar.title}: ${formatCurrency(bar.total)}, ${bar.count} invoice${bar.count === 1 ? "" : "s"}`
                        : `${bar.title}: no invoices`
                    }
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    <div
                      className={cn(
                        "w-full max-w-8 rounded-t-[3px] transition-[height,background-color] duration-300 ease-out",
                        bar.total > 0 ? "bg-primary/85 group-hover:bg-primary" : "h-0.5 bg-border",
                      )}
                      style={bar.total > 0 ? { height: `${Math.max(pct, 1.5)}%` } : undefined}
                    />
                    {bar.total > 0 ? (
                      <span
                        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium tabular-nums text-background opacity-0 shadow-[var(--shadow-popover)] transition-opacity duration-150 group-hover:opacity-100"
                        style={{ bottom: `calc(${Math.max(pct, 1.5)}% + 6px)` }}
                      >
                        {formatCurrency(bar.total)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn("mt-1.5 flex", gap)} aria-hidden="true">
            {bars.map((bar, i) => (
              <span key={bar.key} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground">
                {days === 7 || i % 5 === 0 || i === bars.length - 1 ? bar.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
