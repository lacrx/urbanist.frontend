import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./skeletons.module.css";

type StatTilesData = {
  tiles: Array<{ value: string | number; label: string; detail?: string }>;
};

type StatTilesConfig = { columns?: number };

type Props = { artifact: GatsbyVisualization };

export default function StatTilesSkeleton({ artifact }: Props) {
  const { tiles } = (artifact.data ?? { tiles: [] }) as StatTilesData;
  const cfg = (artifact.config ?? {}) as StatTilesConfig;
  const columns = cfg.columns ?? tiles.length;

  return (
    <dl
      className={styles.statGrid}
      style={columns !== 4 ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
    >
      {tiles.map((tile, i) => (
        <div key={i} className={styles.statTile}>
          <dt className={styles.statValue}>{tile.value}</dt>
          <dd className={styles.statLabel}>
            {tile.label}
            {tile.detail && <span className={styles.statDetail}><br />{tile.detail}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
