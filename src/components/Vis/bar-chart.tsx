import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import BarChartBase from "@/components/Dashboard/bar-chart";

type Props = { artifact: GatsbyVisualization; height: number };

export default function BarChart({ artifact, height }: Props) {
  const { rows } = (artifact.data ?? { rows: [] }) as { rows: Array<Record<string, string | number>> };
  const cfg = (artifact.config ?? { mode: "stacked", xField: "x", yField: "y" }) as Parameters<typeof BarChartBase>[0]["config"];

  return (
    <div data-viz-ready={rows.length ? "true" : undefined}>
      <BarChartBase rows={rows} config={cfg} height={height} />
    </div>
  );
}
