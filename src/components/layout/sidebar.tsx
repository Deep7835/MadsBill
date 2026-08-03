"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CustomerSupportIcon,
  WhatsappIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { MAIN_NAV_ITEMS, MANAGEMENT_NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { BrandLogo } from "@/components/shared/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200",
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-3 py-2">
      <NavSection title="Main Menu" items={MAIN_NAV_ITEMS} pathname={pathname} onNavigate={onNavigate} />
      <NavSection title="Management" items={MANAGEMENT_NAV_ITEMS} pathname={pathname} onNavigate={onNavigate} />
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center px-5 py-5 transition-opacity hover:opacity-90">
      <BrandLogo className="h-11" />
    </Link>
  );
}

export function SidebarFooter() {
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
    <div className="mt-auto space-y-3 p-3 border-t border-slate-200/60 dark:border-slate-800/60">
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

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 disabled:opacity-60"
      >
        <HugeiconsIcon icon={Logout01Icon} className="size-4" />
        {signingOut ? "Signing out…" : "Logout Account"}
      </button>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 lg:block">
      <div className="sticky top-4 flex h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[5px] border border-slate-200/80 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav />
        </div>
        <SidebarFooter />
      </div>
    </aside>
  );
}
