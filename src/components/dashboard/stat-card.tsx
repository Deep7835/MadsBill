import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning";
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-accent text-primary",
  success: "bg-[var(--success)]/12 text-[var(--success)]",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-[0_2px_4px_rgb(16_24_40/0.05),0_16px_40px_-18px_rgb(16_24_40/0.22)]">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {/* Steps up with the column width — ₹3,20,450.00 needs the room. */}
          <p className="truncate text-xl font-bold leading-none tracking-tight 2xl:text-2xl">
            {value}
          </p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", TONE[tone])}
        >
          <Icon className="size-[18px]" />
        </span>
      </CardContent>
    </Card>
  );
}
