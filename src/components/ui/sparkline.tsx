"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  height = 32,
  color = "#4F46E5",
  className = "",
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const viewBoxWidth = 140;
  const viewBoxHeight = 36;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * viewBoxWidth;
      const y = viewBoxHeight - ((val - min) / range) * (viewBoxHeight - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fillPoints = `0,${viewBoxHeight} ${points} ${viewBoxWidth},${viewBoxHeight}`;
  const gradientId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="none"
      className={cn("w-full overflow-hidden block", className)}
      style={{ height: `${height}px` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
