"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconElement } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: IconElement | React.ComponentType<{ className?: string }>;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  /** 0–1 share of the meter to colour; the rest stays grey. Defaults to full. */
  fill?: number;
  /** Drop the card chrome — for cells inside a divided stat strip. */
  bare?: boolean;
}

const TONE_STYLES = {
  default: {
    icon: "border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-400",
    bar: "bg-indigo-500 dark:bg-indigo-400",
  },
  info: {
    icon: "border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-400",
    bar: "bg-sky-400 dark:bg-sky-400",
  },
  success: {
    icon: "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400",
    bar: "bg-emerald-500 dark:bg-emerald-400",
  },
  warning: {
    icon: "border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-400",
    bar: "bg-amber-400 dark:bg-amber-400",
  },
  danger: {
    icon: "border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-400",
    bar: "bg-rose-500 dark:bg-rose-400",
  },
};

const BAR_COUNT = 36;

/** Thin vertical ticks; the first `fill` share is coloured, the rest is the grey track. */
function Meter({ fill, className }: { fill: number; className: string }) {
  const lit = Math.round(Math.min(1, Math.max(0, fill)) * BAR_COUNT);
  return (
    <div className="flex h-6 items-stretch gap-[3px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          className={cn(
            "w-full min-w-[2px] rounded-full",
            i < lit ? className : "bg-slate-200 dark:bg-slate-700",
          )}
        />
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  fill = 1,
  bare = false,
}: StatCardProps) {
  const isHugeIcon = Array.isArray(Icon);
  const Component = Icon as React.ComponentType<{ className?: string }>;
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "min-w-0 p-4 xl:p-5",
        !bare && "rounded-[14px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      )}
    >
      <div className="flex items-center gap-2.5 xl:gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border xl:size-10",
            styles.icon,
          )}
        >
          {isHugeIcon ? (
            <HugeiconsIcon icon={Icon as IconElement} className="size-[18px]" />
          ) : Component ? (
            <Component className="size-[18px]" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <h3 className="mt-0.5 truncate text-lg font-semibold leading-tight tracking-tight text-slate-900 xl:text-xl dark:text-slate-50">
            {value}
          </h3>
        </div>
      </div>

      {hint ? (
        <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}

      <div className="mt-4">
        <Meter fill={fill} className={styles.bar} />
      </div>
    </div>
  );
}
