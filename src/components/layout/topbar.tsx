"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Plus,
  Calculator,
  LogOut,
  Command,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNavDrawer } from "@/components/layout/sidebar";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { CommandPalette } from "@/components/ui/command-palette";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  userEmail: string;
  userName: string;
}

/** Longest matching nav href wins, so /quotations/new resolves to Quotations. */
function useSectionLabel() {
  const pathname = usePathname();

  return (
    NAV_ITEMS.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Dashboard"
  );
}

export function Topbar({ userEmail, userName }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const sectionLabel = useSectionLabel();

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const freeze = document.createElement("style");
    freeze.textContent = "*,*::before,*::after{transition:none !important}";
    document.head.appendChild(freeze);
    document.documentElement.classList.toggle("dark", next);
    void document.body.offsetHeight;
    requestAnimationFrame(() => freeze.remove());
  };

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

  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-4 sm:gap-3 sm:px-6 lg:px-8">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 -ml-1.5 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>

        {/* Current section — the sidebar is hidden below lg, so this is the only cue */}
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground lg:hidden">
          {sectionLabel}
        </span>

        {/* Search: full field from sm up, icon button on phones */}
        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          aria-label="Search"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:hidden"
        >
          <Search className="size-4" />
        </button>

        <div className="relative hidden min-w-0 flex-1 sm:flex sm:max-w-md">
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex h-9 w-full items-center justify-between overflow-hidden rounded-lg border border-border bg-muted/60 px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Search className="size-4 shrink-0" />
              <span className="truncate">Search commands, pages, invoices…</span>
            </div>
            <kbd className="hidden items-center gap-0.5 rounded-sm border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground md:inline-flex">
              <Command className="size-3" /> K
            </kbd>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Quick Action Button — icon only on phones */}
          <Button asChild size="icon" className="sm:hidden">
            <Link href="/quotations/new" aria-label="New quotation">
              <Plus className="size-4" />
            </Link>
          </Button>

          <Button asChild className="hidden pl-3 sm:inline-flex">
            <Link href="/quotations/new">
              <Plus />
              New Quotation
            </Link>
          </Button>

          <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-[var(--shadow-raised)]">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Light mode" : "Dark mode"}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {isDarkMode ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
            </button>
            <Link
              href="/calculator"
              aria-label="Price calculator"
              title="Price calculator"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Calculator className="size-4" strokeWidth={1.75} />
            </Link>
          </div>

          {/* User Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Account menu for ${userName}`}
                title={userEmail}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-foreground ring-1 ring-border ring-offset-2 ring-offset-card transition-[box-shadow] duration-150 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:ring-primary/60"
              >
                {initial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="flex items-center gap-2.5 p-2 font-normal">
                <div className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings />
                  Company Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={signingOut}
                onSelect={handleSignOut}
                destructive
              >
                <LogOut />
                {signingOut ? "Signing out…" : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Left-slide navigation drawer (mobile) */}
      <MobileNavDrawer open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Global Command Palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
