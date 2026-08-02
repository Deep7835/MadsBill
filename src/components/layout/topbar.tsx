"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Plus, User } from "lucide-react";
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
import { SidebarBrand, SidebarNav } from "@/components/layout/sidebar";
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
          </DialogHeader>
          <SidebarBrand companyName={companyName} />
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <span className="truncate text-sm font-medium lg:hidden">{companyName}</span>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/quotations/new">
            <Plus />
            <span className="hidden sm:inline">New quotation</span>
            <span className="sm:hidden">New</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(userName || userEmail || "U").charAt(0).toUpperCase()}
              </span>
            </Button>
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
