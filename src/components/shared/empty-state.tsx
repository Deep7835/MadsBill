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
  const isHugeIcon = Array.isArray(Icon);
  const Component = Icon as React.ComponentType<{ className?: string }>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        {isHugeIcon ? (
          <HugeiconsIcon icon={Icon as IconElement} className="size-5 text-slate-500" />
        ) : Component ? (
          <Component className="size-5 text-slate-500" />
        ) : null}
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
