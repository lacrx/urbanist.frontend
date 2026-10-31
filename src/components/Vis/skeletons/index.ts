import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import BarChartSkeleton from "./bar-chart-skeleton";
import StatTilesSkeleton from "./stat-tiles-skeleton";
import TimelineSkeleton from "./timeline-skeleton";
import VoteSkeleton from "./vote-skeleton";
import DataTableSkeleton from "./data-table-skeleton";

type SkeletonProps = { artifact: GatsbyVisualization; height: number };

export const SKELETONS: Record<string, React.FC<SkeletonProps>> = {
  "bar-chart": BarChartSkeleton,
  "stat-tiles": StatTilesSkeleton as React.FC<SkeletonProps>,
  "timeline": TimelineSkeleton as React.FC<SkeletonProps>,
  "vote-visualization": VoteSkeleton as React.FC<SkeletonProps>,
  "data-table": DataTableSkeleton as React.FC<SkeletonProps>,
};
