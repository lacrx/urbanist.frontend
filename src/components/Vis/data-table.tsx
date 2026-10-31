import { useState } from "react";
import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./data-table.module.css";

type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

type DataTableConfig = {
  columns: Column[];
  defaultSort?: { key: string; direction: "asc" | "desc" };
  caption?: string;
};

type DataTableData = {
  rows: Array<Record<string, string | number | boolean | null>>;
};

type Props = { artifact: GatsbyVisualization };

export default function DataTable({ artifact }: Props) {
  const cfg = (artifact.config ?? { columns: [] }) as DataTableConfig;
  const { rows } = (artifact.data ?? { rows: [] }) as DataTableData;

  const [sortKey, setSortKey] = useState(cfg.defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(cfg.defaultSort?.direction ?? "asc");

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  function handleSort(col: Column) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  return (
    <div className={styles.wrapper} data-viz-ready="true">
      <table className={styles.table} role="grid">
        {cfg.caption && <caption>{cfg.caption}</caption>}
        <thead>
          <tr>
            {cfg.columns.map(col => (
              <th
                key={col.key}
                className={`${col.sortable ? styles.sortable : ""} ${col.align === "right" ? styles.right : col.align === "center" ? styles.center : ""}`}
                onClick={() => handleSort(col)}
                aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              {cfg.columns.map(col => (
                <td
                  key={col.key}
                  className={col.align === "right" ? styles.right : col.align === "center" ? styles.center : ""}
                >
                  {row[col.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
