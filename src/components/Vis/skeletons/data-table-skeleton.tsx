import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./skeletons.module.css";

type Column = { key: string; label: string; align?: string };
type DataTableConfig = { columns: Column[]; caption?: string };
type DataTableData = { rows: Array<Record<string, unknown>> };

type Props = { artifact: GatsbyVisualization };

export default function DataTableSkeleton({ artifact }: Props) {
  const cfg = (artifact.config ?? { columns: [] }) as DataTableConfig;
  const { rows } = (artifact.data ?? { rows: [] }) as DataTableData;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        {cfg.caption && <caption>{cfg.caption}</caption>}
        <thead>
          <tr>
            {cfg.columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((_, i) => (
            <tr key={i}>
              {cfg.columns.map(col => (
                <td key={col.key}>
                  <div className={styles.cellPlaceholder} style={{ width: `${50 + (i * 7 + col.key.length * 13) % 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
