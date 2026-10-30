import BarChart from "./bar-chart";
import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";

type Props = { artifact: GatsbyVisualization; height: number };

export default function BarChartRenderer({ artifact, height }: Props) {
  const rows = (artifact.data ?? []) as Array<Record<string, string | number>>;
  const config = (artifact.config ?? { mode: "stacked", xField: "x", yField: "y" }) as {
    mode: "stacked" | "grouped";
    xField: string;
    yField: string;
    seriesField?: string;
    xLabel?: string;
    yLabel?: string;
    colors?: string[];
    domain?: string[];
    title?: string;
  };

  return <BarChart rows={rows} config={config} height={height} />;
}
