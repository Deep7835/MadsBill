"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active && "text-primary")} />
            {item.label}
            {/* Right-edge marker on the active row. */}
            {active ? (
              <span className="absolute -right-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-primary" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand({ companyName }: { companyName: string }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Printer className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold leading-tight tracking-tight">
          {companyName}
        </span>
        <span className="block text-[11px] text-muted-foreground">Quotation &amp; Billing</span>
      </span>
    </Link>
  );
}

/** Support panel + logout, pinned to the bottom of the rail. */
export function SidebarFooter() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSigningOut(false);
      toast.error(error.message);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mt-auto space-y-2 p-3">
      <div className="rounded-2xl bg-accent/60 p-4 text-center">
        <p className="text-sm font-semibold">Need a hand?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Rates, GST or PDF layout — we can help.
        </p>
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-raised)] transition-colors hover:bg-primary/90"
        >
          <MessageCircle className="size-4" />
          Support
        </a>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
      >
        <LogOut className="size-[18px]" />
        {signingOut ? "Signing out…" : "Logout"}
      </button>
    </div>
  );
}

export function Sidebar({ companyName }: { companyName: string }) {
  return (
    <aside className="hidden w-[264px] shrink-0 lg:block">
      <div className="sticky top-4 flex h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-sidebar text-sidebar-foreground shadow-[var(--shadow-panel)]">
        <SidebarBrand companyName={companyName} />
        <div className="flex-1 overflow-y-auto pb-2">
          <SidebarNav />
        </div>
        <SidebarFooter />
      </div>
    </aside>
  );
}
