import * as styles from "./csv-export.module.css";

type Props = {
  rows: Array<Record<string, string | number | boolean | null>>;
  columns: Array<{ key: string; label: string }>;
  filename: string;
};

function toCsv(
  rows: Props["rows"],
  columns: Props["columns"],
): string {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const v = row[c.key];
        if (v == null) return "";
        if (typeof v === "string") return `"${v.replace(/"/g, '""')}"`;
        return String(v);
      })
      .join(","),
  );
  return [header, ...body].join("\n");
}

export default function CsvExport({ rows, columns, filename }: Props) {
  function handleClick() {
    const csv = toCsv(rows, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export CSV
    </button>
  );
}
