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
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-[var(--shadow-raised)] transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-[3px] focus:ring-ring/15"
          />
        </div>

        {/* Bulk Action Bar if items selected */}
        {selectedIds.size > 0 ? (
          <div className="flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-foreground">
            <span>{selectedIds.size} selected</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 underline underline-offset-2 hover:no-underline"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-[var(--shadow-raised)] transition-colors duration-150 hover:bg-muted [&_svg]:text-muted-foreground">
              <Filter className="size-4" />
              Filter
            </button>
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-[var(--shadow-raised)] transition-colors duration-150 hover:bg-muted [&_svg]:text-muted-foreground">
              <Download className="size-4" />
              Export
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="h-10 w-12 px-4">
                  <input
                    aria-label="Select all rows on this page"
                    type="checkbox"
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-input accent-primary"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className={cn("h-10 px-4 font-medium", col.className, "font-medium text-muted-foreground")}>
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="-mx-1 inline-flex items-center gap-1 rounded px-1 transition-colors duration-150 hover:text-foreground"
                      >
                        {col.header}
                        {sortKey === col.key ? (
                          sortOrder === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="h-[52px] px-4"><div className="size-4 rounded bg-muted" /></td>
                    {columns.map((c, i) => (
                      <td key={i} className="h-[52px] px-4"><div className="h-3.5 w-24 rounded bg-muted" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-14 text-center text-sm text-muted-foreground">
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
                        "group transition-colors duration-150 hover:bg-muted/50",
                        onRowClick && "cursor-pointer",
                        isSelected && "bg-accent/50"
                      )}
                    >
                      <td className="h-[52px] px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          aria-label="Select row"
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(rowId, e as any)}
                          className="size-4 rounded border-input accent-primary"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className={cn("h-[52px] px-4 text-foreground", col.className)}>
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
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{" "}
            <span className="font-medium text-foreground">{sortedData.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="tabular-nums text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
