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

/**
 * Colour is reserved for figures that need attention. Everything else is
 * neutral with the brand colour on the meter, so a row of stats reads calm.
 */
const TONE_STYLES = {
  default: { icon: "text-muted-foreground", bar: "bg-primary" },
  info: { icon: "text-muted-foreground", bar: "bg-primary" },
  success: { icon: "text-muted-foreground", bar: "bg-primary" },
  warning: { icon: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  danger: { icon: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" },
};

const BAR_COUNT = 36;

/** Thin vertical ticks; the first `fill` share is coloured, the rest is the grey track. */
function Meter({ fill, className }: { fill: number; className: string }) {
  const lit = Math.round(Math.min(1, Math.max(0, fill)) * BAR_COUNT);
  return (
    <div className="flex h-3.5 items-stretch gap-[3px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          className={cn("w-full min-w-[2px] rounded-full", i < lit ? className : "bg-muted dark:bg-secondary-hover")}
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
        "min-w-0 px-4 py-3.5",
        !bare && "rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md border border-border",
            styles.icon,
          )}
        >
          {isHugeIcon ? (
            <HugeiconsIcon icon={Icon as IconElement} className="size-3.5" />
          ) : Component ? (
            <Component className="size-3.5" />
          ) : null}
        </span>
      </div>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>

      {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}

      <div className="mt-3">
        <Meter fill={fill} className={styles.bar} />
      </div>
    </div>
  );
}
