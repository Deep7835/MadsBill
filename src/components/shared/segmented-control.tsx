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

/**
 * Tab group on a neutral track; the selected tab lifts onto a card surface.
 * Track radius 10px with 4px padding keeps the 6px tabs concentric.
 */
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
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-[10px] bg-muted p-1",
        className,
      )}
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
              "h-8 shrink-0 rounded-sm px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_1px_rgb(16_24_40/0.04)] dark:bg-secondary-hover"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
