import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Clock01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IconElement } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export interface ModuleFeature {
  icon: IconElement;
  title: string;
  description: string;
}

export interface ModuleShortcut {
  href: string;
  label: string;
  description: string;
  icon: IconElement;
}

export interface ModulePreviewProps {
  title: string;
  description: string;
  /** Icon for the hero tile. */
  icon: IconElement;
  /** One-line promise shown inside the hero card. */
  headline: string;
  summary: string;
  /** Accent hue for the hero tile and feature icons. */
  accent: "indigo" | "amber" | "emerald";
  features: ModuleFeature[];
  /** Things the user can already do elsewhere in the app today. */
  shortcuts?: ModuleShortcut[];
}

const ACCENT: Record<ModulePreviewProps["accent"], { tile: string; soft: string; text: string }> = {
  indigo: {
    tile: "bg-indigo-600 text-white dark:bg-indigo-500",
    soft: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  amber: {
    tile: "bg-amber-500 text-white dark:bg-amber-500",
    soft: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
  },
  emerald: {
    tile: "bg-emerald-600 text-white dark:bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

/**
 * The shared shell every not-yet-shipped Management module renders. Keeping it
 * in one place means Inventory, Expenses and Reports stay visually identical
 * and each page file is just its own content.
 */
export function ModulePreview({
  title,
  description,
  icon,
  headline,
  summary,
  accent,
  features,
  shortcuts,
}: ModulePreviewProps) {
  const tone = ACCENT[accent];

  return (
    <>
      <PageHeader title={title} description={description}>
        <Badge variant="warning" className="h-7 px-3">
          <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
          Launching soon
        </Badge>
      </PageHeader>

      {/* Hero ------------------------------------------------------------ */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-[5px] shadow-[var(--shadow-raised)]",
              tone.tile,
            )}
          >
            <HugeiconsIcon icon={icon} className="size-7" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{headline}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* What's coming --------------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight text-muted-foreground">
          What this module will do
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full transition-shadow hover:shadow-[var(--shadow-raised)]">
              <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
                <div className={cn("flex size-10 items-center justify-center rounded-[5px]", tone.soft)}>
                  <HugeiconsIcon icon={feature.icon} className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight">{feature.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Available today -------------------------------------------------- */}
      {shortcuts?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HugeiconsIcon icon={Tick02Icon} className={cn("size-4", tone.text)} />
              Available right now
            </CardTitle>
            <CardDescription className="text-xs">
              Until this module ships, these screens already cover part of the job.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group flex items-center gap-3 rounded-[5px] border border-border/70 bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-[5px]", tone.soft)}>
                  <HugeiconsIcon icon={shortcut.icon} className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{shortcut.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{shortcut.description}</p>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
