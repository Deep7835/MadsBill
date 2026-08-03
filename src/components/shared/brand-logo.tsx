/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * The Madskrafting wordmark. There is no light-on-dark variant of the asset,
 * so dark mode flattens it to solid white rather than letting the black
 * lettering disappear into the panel.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/Madskrafting.svg"
      alt="Madskrafting"
      width={210}
      height={60}
      className={cn("h-9 w-auto select-none dark:brightness-0 dark:invert", className)}
    />
  );
}
