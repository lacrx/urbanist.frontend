import DataTable from "./data-table";
import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";

type Props = { artifact: GatsbyVisualization; height: number };

export default function DataTableRenderer({ artifact }: Props) {
  const { columns, rows, rowKey, defaultSort, caption } = (artifact.data ?? {
    columns: [],
    rows: [],
    rowKey: "id",
  }) as {
    columns: Array<{ key: string; label: string; align?: "left" | "right" | "center"; sortable?: boolean }>;
    rows: Array<Record<string, string | number | boolean | null>>;
    rowKey: string;
    defaultSort?: { key: string; direction: "asc" | "desc" };
    caption?: string;
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={rowKey}
      defaultSort={defaultSort}
      caption={caption}
    />
  );
}
