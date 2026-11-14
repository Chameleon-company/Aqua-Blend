"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right";
}

export interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderExpanded?: (row: T) => ReactNode;
  caption: string;
  emptyMessage?: string;
}

type SortDirection = "asc" | "desc";

export function SortableTable<T>({
  columns,
  rows,
  getRowKey,
  renderExpanded,
  caption,
  emptyMessage = "No data available.",
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;
    const withValues = rows.map((row) => ({ row, value: column.sortValue!(row) }));
    withValues.sort((a, b) => {
      if (a.value == null && b.value == null) return 0;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      if (a.value < b.value) return sortDir === "asc" ? -1 : 1;
      if (a.value > b.value) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return withValues.map((w) => w.row);
  }, [rows, sortKey, sortDir, columns]);

  function toggleSort(column: Column<T>) {
    if (!column.sortValue) return;
    if (sortKey !== column.key) {
      setSortKey(column.key);
      setSortDir("asc");
    } else {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    }
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted py-6">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-strong text-left">
            {renderExpanded ? <th scope="col" className="w-8 py-2" /> : null}
            {columns.map((column) => {
              const isSorted = sortKey === column.key;
              const ariaSort = column.sortValue ? (isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none") : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={clsx(
                    "py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted whitespace-nowrap",
                    column.align === "right" && "text-right",
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {column.header}
                      <span
                        aria-hidden="true"
                        className={clsx(
                          "inline-block h-0 w-0 border-x-[3px] border-x-transparent border-t-[4px] transition-transform",
                          isSorted ? "border-t-ink" : "border-t-ink-faint/60",
                          isSorted && sortDir === "asc" && "rotate-180",
                        )}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const key = getRowKey(row);
            const isExpanded = expanded.has(key);
            return (
              <Fragment key={key}>
                <tr className="border-b border-border hover:bg-surface-alt transition-colors">
                  {renderExpanded ? (
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse row" : "Expand row"}
                        onClick={() => toggleExpanded(key)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-border-strong text-xs focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                      </button>
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className={clsx("py-2 px-3", column.align === "right" && "text-right tabular-nums")}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {renderExpanded && isExpanded ? (
                  <tr className="border-b border-border bg-surface-alt/60">
                    <td colSpan={columns.length + 1} className="p-4">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
