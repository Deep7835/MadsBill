import * as React from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Right-align on the desktop table (money, counts). */
  align?: "left" | "right";
  /** Drop the column from the table below this breakpoint. */
  hideBelow?: "sm" | "md" | "lg";
  /** Rendered as the card heading on mobile instead of a label/value pair. */
  primary?: boolean;
  /** Sits directly under the heading on mobile, unlabelled. */
  subtitle?: boolean;
  /** Keep out of the mobile card entirely. */
  hideOnCard?: boolean;
  className?: string;
}

interface DataListProps<T> {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  /** Row actions — a dropdown trigger, usually. */
  actions?: (row: T) => React.ReactNode;
  /** Makes the whole mobile card tappable. */
  href?: (row: T) => string;
}

const HIDE_CLASS: Record<NonNullable<DataColumn<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

/**
 * One data set, two presentations: a table from `md` up, stacked full-width
 * cards below it. Tables cannot be made to work on a 360px screen without
 * either a horizontal scroll or unreadable truncation, so phones get cards.
 */
export function DataList<T>({ rows, columns, rowKey, actions, href }: DataListProps<T>) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const subtitle = columns.find((c) => c.subtitle);
  const details = columns.filter(
    (c) => !c.primary && !c.subtitle && !c.hideOnCard && c !== primary,
  );

  return (
    <>
      {/* ---------------------------------------------------- mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => {
          const link = href?.(row);
          const heading = (
            <span className="block truncate text-sm font-semibold text-foreground">
              {primary.cell(row)}
            </span>
          );

          return (
            <li key={rowKey(row)} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {link ? (
                    <Link href={link} className="block min-w-0">
                      {heading}
                    </Link>
                  ) : (
                    heading
                  )}
                  {subtitle ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {subtitle.cell(row)}
                    </span>
                  ) : null}
                </div>
                {actions ? <div className="-mr-2 -mt-1 shrink-0">{actions(row)}</div> : null}
              </div>

              {details.length ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  {details.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {column.header}
                      </dt>
                      <dd className="mt-0.5 truncate text-sm text-foreground">
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* --------------------------------------------------- desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.align === "right" && "text-right",
                    column.hideBelow && HIDE_CLASS[column.hideBelow],
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
              {actions ? <TableHead className="w-12" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.hideBelow && HIDE_CLASS[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
                {actions ? <TableCell className="text-right">{actions(row)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
