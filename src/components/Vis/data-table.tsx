import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import DataTableBase from "@/components/Dashboard/data-table";

type DataTableConfig = {
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center"; sortable?: boolean }>;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  caption?: string;
};

type Props = { artifact: GatsbyVisualization };

export default function DataTable({ artifact }: Props) {
  const cfg = (artifact.config ?? { columns: [] }) as DataTableConfig;
  const { rows } = (artifact.data ?? { rows: [] }) as { rows: Array<Record<string, string | number | boolean | null>> };

  return (
    <div data-viz-ready="true">
      <DataTableBase
        columns={cfg.columns}
        rows={rows}
        rowKey={cfg.columns[0]?.key ?? "id"}
        defaultSort={cfg.defaultSort}
        caption={cfg.caption}
      />
    </div>
  );
}
