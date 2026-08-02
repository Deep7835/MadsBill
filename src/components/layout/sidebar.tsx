"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Printer } from "lucide-react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand({ companyName }: { companyName: string }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Printer className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{companyName}</span>
        <span className="block text-xs text-muted-foreground">Quotation &amp; Billing</span>
      </span>
    </Link>
  );
}

export function Sidebar({ companyName }: { companyName: string }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <SidebarBrand companyName={companyName} />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <p className="px-4 py-3 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} {companyName}
        </p>
      </div>
    </aside>
  );
}
