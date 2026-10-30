import StatTiles from "./stat-tiles";
import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";

type Props = { artifact: GatsbyVisualization; height: number };

export default function StatTilesRenderer({ artifact }: Props) {
  const { tiles, columns } = (artifact.data ?? { tiles: [] }) as {
    tiles: Array<{ value: string | number; label: string; detail?: string; trend?: "positive" | "negative" | "neutral" }>;
    columns?: number;
  };

  return <StatTiles tiles={tiles} columns={columns} />;
}
