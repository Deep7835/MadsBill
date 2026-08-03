"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  CheckSquare,
  Square,
  ArrowUpDown,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search records...",
  onRowClick,
  isLoading = false,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Search filtering
  const filteredData = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "").toLowerCase().includes(query.toLowerCase())
    )
  );

  // Sorting
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return sortOrder === "asc" ? -1 : 1;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((row) => row.id ?? JSON.stringify(row))));
    }
  };

  const toggleSelectRow = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Bulk Action Bar if items selected */}
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <span>{selectedIds.size} selected</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 underline hover:text-indigo-900 dark:hover:text-indigo-100"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Filter className="size-3.5" />
              Filter
            </button>
            <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Download className="size-3.5" />
              Export
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className={cn("px-4 py-3.5", col.className)}>
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        {col.header}
                        <ArrowUpDown className="size-3" />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="size-4 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    {columns.map((c, i) => (
                      <td key={i} className="px-4 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const rowId = row.id ?? idx;
                  const isSelected = selectedIds.has(rowId);
                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={cn(
                        "group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                        onRowClick && "cursor-pointer",
                        isSelected && "bg-indigo-50/50 dark:bg-indigo-950/20"
                      )}
                    >
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(rowId, e as any)}
                          className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300", col.className)}>
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
          <div>
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
