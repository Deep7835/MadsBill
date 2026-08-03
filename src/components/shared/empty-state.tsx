import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconElement } from "@/components/ui/icon";

interface EmptyStateProps {
  icon: IconElement | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const isIconObject = typeof Icon === "object" && Icon !== null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {isIconObject ? (
          <HugeiconsIcon icon={Icon as IconElement} className="size-5 text-muted-foreground" />
        ) : (
          /* @ts-ignore fallback component */
          <Icon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
