"use client";

import { useMemo } from "react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityDay } from "@/lib/queries";

const WEEKS = 53;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Row labels follow GitHub: only alternate days are named, to save width. */
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/** Index 0 is "nothing billed"; 1–4 ramp with the day's share of the busiest day. */
const LEVEL_CLASSES = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-indigo-200 dark:bg-indigo-900",
  "bg-indigo-400 dark:bg-indigo-700",
  "bg-indigo-600 dark:bg-indigo-500",
  "bg-indigo-800 dark:bg-indigo-300",
];

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

interface Cell {
  key: string;
  date: Date;
  total: number;
  count: number;
  level: number;
  /** Days after today are rendered as blanks so the grid stays rectangular. */
  future: boolean;
}

export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const { weeks, monthColumns, busiest, totalBilled, activeDays } = useMemo(() => {
    const byDate = new Map(activity.map((day) => [day.date, day]));
    const max = activity.reduce((peak, day) => Math.max(peak, day.total), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Land the final column on the week containing today, then walk back.
    const gridEnd = new Date(today);
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridStart.getDate() - (WEEKS * 7 - 1));

    const cols: Cell[][] = [];
    const labels: { column: number; label: string }[] = [];
    const cursor = new Date(gridStart);
    let lastMonth = -1;

    for (let week = 0; week < WEEKS; week++) {
      const column: Cell[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(cursor);
        const key = toKey(date);
        const hit = byDate.get(key);
        const total = hit?.total ?? 0;
        column.push({
          key,
          date,
          total,
          count: hit?.count ?? 0,
          level: total > 0 && max > 0 ? Math.min(4, Math.ceil((total / max) * 4)) : 0,
          future: date > today,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      // Label a column when its first row starts a new month.
      const month = column[0].date.getMonth();
      if (month !== lastMonth) {
        labels.push({ column: week, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
      cols.push(column);
    }

    return {
      weeks: cols,
      monthColumns: labels,
      busiest: max,
      totalBilled: activity.reduce((sum, day) => sum + day.total, 0),
      activeDays: activity.filter((day) => day.total > 0).length,
    };
  }, [activity]);

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="w-max">
          {/* Month ruler — each label sits above the week its month begins in. */}
          <div className="relative mb-1 ml-9 h-4">
            {monthColumns.map(({ column, label }) => (
              <span
                key={`${label}-${column}`}
                className="absolute top-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500"
                style={{ left: `${column * 15}px` }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <div className="mr-1 flex w-8 shrink-0 flex-col gap-[3px]">
              {DAY_LABELS.map((label, row) => (
                <span
                  key={row}
                  className="h-3 text-[10px] leading-3 font-semibold text-slate-400 dark:text-slate-500"
                >
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((column, week) => (
              <div key={week} className="flex flex-col gap-[3px]">
                {column.map((cell) =>
                  cell.future ? (
                    <span key={cell.key} className="size-3" />
                  ) : (
                    <span
                      key={cell.key}
                      title={
                        cell.count
                          ? `${formatCurrency(cell.total)} · ${cell.count} invoice${
                              cell.count === 1 ? "" : "s"
                            } on ${cell.key}`
                          : `No billing on ${cell.key}`
                      }
                      className={cn("size-3 rounded-[2px]", LEVEL_CLASSES[cell.level])}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {activeDays > 0 ? (
            <>
              {formatCurrency(totalBilled)} billed across {activeDays} day
              {activeDays === 1 ? "" : "s"} · busiest {formatCurrency(busiest)}
            </>
          ) : (
            <>No invoices raised in the last year yet.</>
          )}
        </p>

        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>Less</span>
          {LEVEL_CLASSES.map((tone, level) => (
            <span key={level} className={cn("size-3 rounded-[2px]", tone)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
