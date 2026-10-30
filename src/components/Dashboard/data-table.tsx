import { useState, useCallback } from "react";
import "./dashboard-tokens.module.css";
import * as styles from "./data-table.module.css";
import type { LinkedSelection } from "./types";

export type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

type Props = {
  columns: Column[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowKey: string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  caption?: string;
  selection?: LinkedSelection;
};

export default function DataTable({
  columns,
  rows,
  rowKey,
  defaultSort,
  caption,
  selection,
}: Props) {
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultSort?.direction ?? "asc",
  );

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
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
    : rows;

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
          {sorted.map((row) => {
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
                    {row[col.key] ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
