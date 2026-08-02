"use client";

import { cn } from "@/lib/utils";

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  className?: string;
  "aria-label"?: string;
}

/** Pill tab group: solid accent on the active segment, tinted on the rest. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex w-full gap-2 overflow-x-auto sm:w-auto", className)}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-raised)]"
                : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
