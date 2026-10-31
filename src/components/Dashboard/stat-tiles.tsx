import type { ReactNode } from "react";
import "./dashboard-tokens.module.css";
import * as styles from "./stat-tiles.module.css";

export type StatTile = {
  value: string | number;
  label: ReactNode;
  detail?: ReactNode;
  trend?: "positive" | "negative" | "neutral";
};

type Props = {
  tiles: StatTile[];
  columns?: number;
};

export default function StatTiles({ tiles, columns }: Props) {
  const cols = columns ?? tiles.length;

  return (
    <dl
      className={styles.grid}
      style={cols !== 4 ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}
    >
      {tiles.map((tile, i) => (
        <div key={i} className={styles.tile}>
          <dt
            className={styles.value}
            data-trend={tile.trend}
          >
            {tile.value}
          </dt>
          <dd className={styles.label}>
            {tile.label}
            {tile.detail && (
              <span className={styles.detail}>
                <br />
                {tile.detail}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
