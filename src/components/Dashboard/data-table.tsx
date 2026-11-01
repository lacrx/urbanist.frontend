import { useState, useCallback, useMemo, useEffect } from "react";
import * as styles from "./data-table.module.css";
import type { LinkedSelection } from "./types";

export type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
};

type Props = {
  columns: Column[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowKey: string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  caption?: string;
  selection?: LinkedSelection;
  searchable?: boolean;
  searchKeys?: string[];
  pageSize?: number;
};

export default function DataTable({
  columns,
  rows,
  rowKey,
  defaultSort,
  caption,
  selection,
  searchable,
  searchKeys,
  pageSize,
}: Props) {
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultSort?.direction ?? "asc",
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const keys = searchKeys ?? columns.map((c) => c.key);
    const q = query.toLowerCase();
    return rows.filter((row) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, searchKeys, columns]);

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const paged = pageSize ? sorted.slice(safePage * pageSize, (safePage + 1) * pageSize) : sorted;

  const prevPage = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const nextPage = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);

  useEffect(() => setPage(0), [rows, query]);

  const handleSort = useCallback(
    (col: Column) => {
      if (!col.sortable) return;
      if (sortKey === col.key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(col.key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  return (
    <div className={styles.wrapper}>
      {searchable && (
        <div className={styles.searchRow}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search table"
          />
        </div>
      )}
      <table className={styles.table} role="grid">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.sortable ? styles.sortable : ""} ${col.align === "right" ? styles.right : col.align === "center" ? styles.center : ""}`}
                onClick={() => handleSort(col)}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.label}
                {sortKey === col.key && (
                  <span className={styles.sortIndicator}>
                    {sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((row) => {
            const id = String(row[rowKey] ?? "");
            const active = selection?.activeUnit === id;
            return (
              <tr
                key={id}
                className={active ? styles.active : undefined}
                onMouseEnter={() => selection?.onHover(id)}
                onMouseLeave={() => selection?.onHover(null)}
                onClick={() => selection?.onSelect(id)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={
                      col.align === "right"
                        ? styles.right
                        : col.align === "center"
                          ? styles.center
                          : ""
                    }
                  >
                    {col.render
                      ? col.render(row[col.key], row as Record<string, unknown>)
                      : (row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {pageSize && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={prevPage}
            disabled={safePage === 0}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className={styles.pageInfo}>
            {safePage + 1} / {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={nextPage}
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
