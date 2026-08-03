"use client";

import { TrendingUp, TrendingDown, MoreVertical } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconElement } from "@/components/ui/icon";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  change?: string;
  trend?: "up" | "down";
  sparklineData?: number[];
  icon: IconElement | React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
}

const TONE_STYLES = {
  default: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
};

export function StatCard({
  label,
  value,
  hint,
  change,
  trend = "up",
  sparklineData = [12, 18, 15, 26, 32, 28, 40],
  icon: Icon,
  tone = "default",
}: StatCardProps) {
  const isHugeIcon = Array.isArray(Icon);
  const Component = Icon as React.ComponentType<{ className?: string }>;
  const isPositive = trend === "up";

  return (
    <div className="group relative overflow-hidden rounded-[5px] border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* Top Header Row: Label/Value on Left, Icon & Subtitle Info on Top Right */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <h3 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </h3>
        </div>

        {/* Top Right Corner: Icon, Trend Badge & Subtitle */}
        <div className="flex flex-col items-end gap-1 text-right shrink-0">
          <div className={cn("flex size-8 items-center justify-center rounded-[5px] transition-transform group-hover:scale-105", TONE_STYLES[tone])}>
            {isHugeIcon ? (
              <HugeiconsIcon icon={Icon as IconElement} className="size-4" />
            ) : Component ? (
              <Component className="size-4" />
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold",
                  isPositive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                )}
              >
                {isPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {change}
              </span>
            )}
          </div>

          {hint && (
            <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]">
              {hint}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Full width, clean, uncluttered graph */}
      <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
        <Sparkline
          data={sparklineData}
          height={28}
          color={isPositive ? "#22C55E" : "#EF4444"}
        />
      </div>
    </div>
  );
}
