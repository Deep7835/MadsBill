"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Calculator,
  FileText,
  Users,
  Package,
  Boxes,
  Receipt,
  BarChart3,
  Settings,
  Plus,
  Moon,
  Sun,
  X,
  ArrowRight,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const navigate = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(path);
  };

  const commands = [
    { label: "Dashboard", category: "Navigation", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Price Calculator", category: "Navigation", icon: Calculator, path: "/calculator" },
    { label: "Quotations & Bills", category: "Navigation", icon: FileText, path: "/quotations" },
    { label: "Customers Ledger", category: "Navigation", icon: Users, path: "/customers" },
    { label: "Products & Rates", category: "Navigation", icon: Package, path: "/products" },
    { label: "Inventory (Soon)", category: "Navigation", icon: Boxes, path: "/inventory" },
    { label: "Expenses (Soon)", category: "Navigation", icon: Receipt, path: "/expenses" },
    { label: "Reports & GST", category: "Navigation", icon: BarChart3, path: "/reports" },
    { label: "Company Settings", category: "Navigation", icon: Settings, path: "/settings" },
    { label: "Create New Quotation", category: "Quick Actions", icon: Plus, path: "/quotations/new" },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 pt-20 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header Search Input */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="mr-3 size-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            autoFocus
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No matching commands found.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <span className="block font-semibold">{item.label}</span>
                        <span className="block text-[10px] text-slate-400">{item.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">↑↓</span>
            <span>Navigate</span>
            <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Enter</span>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">ESC</span>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
