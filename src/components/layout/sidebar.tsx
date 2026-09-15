"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CustomerSupportIcon,
  WhatsappIcon,
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
    <div className="space-y-1">
      {collapsed ? (
        <div className="mx-auto mb-2 h-px w-8 bg-slate-200 dark:bg-slate-800" />
      ) : (
        <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
          {title}
        </div>
      )}
      <div className="space-y-1">
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
                "group relative flex items-center rounded-[10px] text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              )}
            >
              {/* Active marker sits on the panel's left edge, outside the pill. */}
              {active ? (
                <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500" />
              ) : null}
              <HugeiconsIcon
                icon={item.icon}
                className={cn(
                  "size-5 shrink-0",
                  active ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-400"
                )}
              />
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {item.badge}
                    </span>
                  ) : active ? (
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-slate-400" />
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
    <nav className="flex flex-col gap-7 px-3 py-2">
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
        collapsed ? "justify-center px-2 py-4" : "min-w-0 flex-1 px-4 py-4"
      )}
    >
      {collapsed ? (
        <span className="flex size-10 items-center justify-center rounded-[10px] bg-indigo-600 text-white dark:bg-indigo-500">
          <HugeiconsIcon icon={PrinterIcon} className="size-5" />
        </span>
      ) : (
        <BrandLogo className="h-10" />
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
    <div className="mt-auto space-y-3 p-3">
      {!collapsed && (
        <div className="rounded-[14px] border border-slate-200 p-4 dark:border-slate-800">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <HugeiconsIcon icon={CustomerSupportIcon} className="size-[18px]" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Need Assistance?</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Custom rates, GST invoices or billing questions.
          </p>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 underline underline-offset-4 transition-colors hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
          >
            <HugeiconsIcon icon={WhatsappIcon} className="size-4" />
            WhatsApp Support
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        title={collapsed ? "Logout account" : undefined}
        className={cn(
          "flex w-full items-center rounded-[10px] text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
        )}
      >
        <HugeiconsIcon icon={Logout01Icon} className="size-5 shrink-0" />
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
        <DialogPrimitive.Overlay className="nav-scrim fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="nav-drawer fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[300px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl lg:hidden dark:border-slate-800 dark:bg-slate-900"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>

          <div className="flex items-center justify-between pr-3">
            <SidebarBrand onNavigate={() => onOpenChange(false)} />
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
        "no-print hidden shrink-0 transition-[width] duration-300 ease-out lg:block",
        collapsed ? "w-[84px]" : "w-[260px]"
      )}
    >
      <div className="sticky top-3 flex h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className={cn("flex items-center", collapsed ? "flex-col" : "pr-3")}>
          <SidebarBrand collapsed={collapsed} />
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              collapsed && "mb-2",
            )}
          >
            <HugeiconsIcon icon={collapsed ? SidebarRight01Icon : SidebarLeft01Icon} className="size-4" />
          </button>
        </div>
        <div className="mx-4 h-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav collapsed={collapsed} />
        </div>

        <SidebarFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}
