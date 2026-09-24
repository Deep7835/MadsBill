"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Logout01Icon,
  PrinterIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { MAIN_NAV_ITEMS, MANAGEMENT_NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { BrandLogo } from "@/components/shared/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "madsbill:sidebar-collapsed";

function NavSection({
  title,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-auto mb-2 h-px w-6 bg-border" />
      ) : (
        <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex h-10 items-center rounded-lg text-sm transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                collapsed ? "justify-center" : "gap-3 px-3",
                active
                  ? "bg-muted font-medium text-foreground dark:bg-secondary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                strokeWidth={active ? 2 : 1.5}
                className={cn(
                  "size-[18px] shrink-0 transition-colors duration-150",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-secondary">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-3 py-4" aria-label="Main">
      <NavSection
        title="Main Menu"
        items={MAIN_NAV_ITEMS}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <NavSection
        title="Management"
        items={MANAGEMENT_NAV_ITEMS}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

export function SidebarBrand({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      aria-label="Madskrafting dashboard"
      className={cn(
        "flex items-center transition-opacity hover:opacity-90",
        collapsed ? "justify-center" : "min-w-0 flex-1 px-3"
      )}
    >
      {collapsed ? (
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HugeiconsIcon icon={PrinterIcon} className="size-[18px]" />
        </span>
      ) : (
        <BrandLogo className="h-8" />
      )}
    </Link>
  );
}

export function SidebarFooter({ collapsed }: { collapsed?: boolean }) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSigningOut(false);
      toast.error(error.message);
      return;
    }
    window.location.href = "/login";
  }

  return (
    <div className="mt-auto border-t border-border p-3">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        title={collapsed ? "Logout account" : undefined}
        className={cn(
          "flex h-10 w-full items-center rounded-lg text-sm text-muted-foreground transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 dark:hover:bg-rose-950/40 dark:hover:text-rose-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          collapsed ? "justify-center" : "gap-3 px-3"
        )}
      >
        <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} className="size-[18px] shrink-0" />
        {collapsed ? (
          <span className="sr-only">Logout account</span>
        ) : (
          <span>{signingOut ? "Signing out…" : "Logout Account"}</span>
        )}
      </button>
    </div>
  );
}

/**
 * Slides in from the left edge rather than opening as a centred modal, so the
 * nav arrives from the same side it lives on at desktop widths.
 */
export function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="nav-scrim fixed inset-0 z-50 bg-slate-950/45 lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="nav-drawer fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[280px] flex-col overflow-hidden border-r border-border bg-sidebar shadow-[var(--shadow-popover)] lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>

          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border pr-3">
            <SidebarBrand onNavigate={() => onOpenChange(false)} />
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            <SidebarNav onNavigate={() => onOpenChange(false)} />
          </div>

          <SidebarFooter />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      window.localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-border", collapsed ? "justify-center" : "pr-3")}>
        {collapsed ? null : <SidebarBrand />}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <HugeiconsIcon icon={collapsed ? SidebarRight01Icon : SidebarLeft01Icon} strokeWidth={1.5} className="size-[18px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
