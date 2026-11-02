import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import StatTilesBase from "@/components/Dashboard/stat-tiles";

type Props = { artifact: GatsbyVisualization };

export default function StatTiles({ artifact }: Props) {
  const { tiles } = (artifact.data ?? { tiles: [] }) as { tiles: Array<{ value: string | number; label: string; detail?: string }> };
  const cfg = (artifact.config ?? {}) as { columns?: number };

  return (
    <div data-viz-ready="true">
      <StatTilesBase tiles={tiles} columns={cfg.columns} />
    </div>
  );
}
