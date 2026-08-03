"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

export type IconElement = ComponentProps<typeof HugeiconsIcon>["icon"];

export interface IconProps {
  icon: IconElement;
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ icon, className, size, color = "currentColor", strokeWidth = 1.5 }: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      className={className}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}
