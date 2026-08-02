"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarBrand, SidebarFooter, SidebarNav } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  companyName: string;
  userEmail: string;
  userName: string;
}

export function Topbar({ companyName, userEmail, userName }: TopbarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [query, setQuery] = useState("");

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

  /** Search jumps to the quotations list pre-filtered — no fake search box. */
  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/quotations?q=${encodeURIComponent(term)}`);
  }

  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <header className="flex items-center gap-3 py-4">
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
          </DialogHeader>
          <SidebarBrand companyName={companyName} />
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter />
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSearch} className="relative min-w-0 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search quotations…"
          aria-label="Search quotations"
          className="h-11 w-full rounded-2xl border border-border/70 bg-card pl-11 pr-4 text-sm shadow-[var(--shadow-raised)] transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/quotations/new">
            <Plus />
            New quotation
          </Link>
        </Button>
        <Button asChild size="icon" className="sm:hidden" aria-label="New quotation">
          <Link href="/quotations/new">
            <Plus />
          </Link>
        </Button>

        <Link
          href="/quotations?status=invoice"
          aria-label="Unpaid invoices"
          className="hidden size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground shadow-[var(--shadow-raised)] transition-colors hover:text-foreground sm:inline-flex"
        >
          <Bell className="size-[18px]" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-border/70 bg-card px-2 shadow-[var(--shadow-raised)] transition-colors hover:border-primary/40 sm:px-3"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {initial}
              </span>
              <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">
                {userName}
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <User className="size-4 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{userName}</span>
                <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Company settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive disabled={signingOut} onSelect={handleSignOut}>
              <LogOut />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
