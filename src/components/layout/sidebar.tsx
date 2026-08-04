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
        <div className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                "group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200",
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5",
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                className={cn(
                  "size-5 shrink-0 transition-transform group-hover:scale-105",
                  active ? "text-white" : "text-slate-500 dark:text-slate-400"
                )}
              />
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
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
    <nav className={cn("flex flex-col gap-6 py-2", collapsed ? "px-3" : "px-3")}>
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
        collapsed ? "justify-center px-2 py-4" : "px-5 py-5"
      )}
    >
      {collapsed ? (
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-500">
          <HugeiconsIcon icon={PrinterIcon} className="size-5" />
        </span>
      ) : (
        <BrandLogo className="h-11" />
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
    <div className="mt-auto space-y-3 border-t border-slate-200/60 p-3 dark:border-slate-800/60">
      {!collapsed && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white p-3.5 dark:border-indigo-950/50 dark:from-indigo-950/20 dark:to-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <HugeiconsIcon icon={CustomerSupportIcon} className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>Need Assistance?</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Custom rates, GST invoices or billing questions.
          </p>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <HugeiconsIcon icon={WhatsappIcon} className="size-4" />
            WhatsApp Support
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        title={collapsed ? "Logout account" : undefined}
        className={cn(
          "flex w-full items-center rounded-xl text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40",
          collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
        )}
      >
        <HugeiconsIcon icon={Logout01Icon} className="size-4 shrink-0" />
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
              className="flex size-9 shrink-0 items-center justify-center rounded-[5px] text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
        "hidden shrink-0 transition-[width] duration-300 ease-out lg:block",
        collapsed ? "w-[84px]" : "w-[260px]"
      )}
    >
      <div className="sticky top-4 flex h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[5px] border border-slate-200/80 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <SidebarBrand collapsed={collapsed} />

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mx-3 mb-1 flex items-center rounded-[5px] border border-slate-200 bg-white text-[11px] font-semibold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800 dark:hover:text-indigo-400",
            collapsed ? "justify-center py-2" : "gap-2 px-3 py-2"
          )}
        >
          <HugeiconsIcon icon={collapsed ? SidebarRight01Icon : SidebarLeft01Icon} className="size-4 shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>

        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav collapsed={collapsed} />
        </div>

        <SidebarFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}
