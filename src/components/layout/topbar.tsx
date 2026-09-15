"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Plus,
  Bell,
  ChevronDown,
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
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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
      <header className="no-print flex items-center gap-2 py-3 sm:gap-2.5">
        {/* Mobile menu trigger */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="size-10 shrink-0 rounded-[10px] lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5 text-slate-700 dark:text-slate-200" />
        </Button>

        {/* Current section — the sidebar is hidden below lg, so this is the only cue */}
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 lg:hidden dark:text-slate-200">
          {sectionLabel}
        </span>

        {/* Search: full field from sm up, icon button on phones */}
        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          aria-label="Search"
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 sm:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Search className="size-4" />
        </button>

        <div className="relative hidden min-w-0 flex-1 sm:flex sm:max-w-md">
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex h-10 w-full items-center justify-between overflow-hidden rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm text-slate-400 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Search className="size-4 shrink-0 text-slate-400" />
              <span className="truncate text-slate-400">Search commands, pages, invoices...</span>
            </div>
            <kbd className="hidden items-center gap-0.5 rounded-[6px] border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 md:inline-flex dark:border-slate-700 dark:text-slate-400">
              <Command className="size-3" /> K
            </kbd>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          {/* Quick Action Button — icon only on phones */}
          <Button
            asChild
            size="icon"
            className="size-10 rounded-[10px] bg-slate-900 text-white shadow-none hover:bg-slate-800 sm:hidden dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Link href="/quotations/new" aria-label="New quotation">
              <Plus className="size-4" />
            </Link>
          </Button>

          <Button
            asChild
            className="hidden h-10 rounded-[10px] bg-slate-900 px-4 text-sm font-medium text-white shadow-none hover:bg-slate-800 sm:inline-flex dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Link href="/quotations/new">
              <Plus className="mr-1.5 size-4" />
              New Quotation
            </Link>
          </Button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="hidden size-10 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            {isDarkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </button>

          {/* Notifications button */}
          <Link
            href="/quotations?status=invoice"
            aria-label="Unpaid invoices notifications"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
          </Link>

          {/* User Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] border border-slate-200 bg-white px-2 transition-colors hover:border-slate-300 sm:px-2.5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {initial}
                </span>
                <span className="hidden max-w-28 truncate text-sm font-medium text-slate-800 lg:block dark:text-slate-200">
                  {userName}
                </span>
                <ChevronDown className="hidden size-3.5 text-slate-400 lg:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-[12px] p-1.5 shadow-xl">
              <DropdownMenuLabel className="flex items-center gap-2.5 p-2 font-normal">
                <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900 dark:text-slate-100">{userName}</span>
                  <span className="block truncate text-[11px] text-slate-400">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={toggleTheme} className="rounded-xl text-xs font-medium sm:hidden">
                {isDarkMode ? (
                  <Sun className="mr-2 size-4 text-amber-400" />
                ) : (
                  <Moon className="mr-2 size-4 text-slate-500" />
                )}
                {isDarkMode ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl text-xs font-medium">
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="size-4 text-slate-500" />
                  Company Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={signingOut}
                onSelect={handleSignOut}
                className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-600 dark:text-rose-400 dark:focus:bg-rose-950"
              >
                <LogOut className="mr-2 size-4" />
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
