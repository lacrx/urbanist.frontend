import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./skeletons.module.css";

const FALLBACK_PALETTE = ["#4269d0", "#efb118", "#ff725c", "#a463f2", "#36b07e", "#e6549f", "#0bb4ff", "#54bebe"];

type BarChartConfig = {
  xField: string;
  yField: string;
  seriesField?: string;
  colors?: string[];
  domain?: string[];
  title?: string;
};

type BarChartData = {
  rows: Array<Record<string, string | number>>;
};

type Props = { artifact: GatsbyVisualization; height: number };

export default function BarChartSkeleton({ artifact, height }: Props) {
  const { rows } = (artifact.data ?? { rows: [] }) as BarChartData;
  const cfg = (artifact.config ?? { xField: "x", yField: "y" }) as BarChartConfig;
  if (!rows.length) return null;

  const palette = cfg.colors ?? FALLBACK_PALETTE;
  const domain = cfg.domain ??
    (cfg.seriesField ? [...new Set(rows.map(r => String(r[cfg.seriesField!])))] : undefined);

  const xValues = [...new Set(rows.map(r => String(r[cfg.xField])))];

  const stacked: Record<string, number> = {};
  for (const row of rows) {
    const x = String(row[cfg.xField]);
    stacked[x] = (stacked[x] ?? 0) + Number(row[cfg.yField]);
  }
  const maxY = Math.max(...Object.values(stacked), 1);

  const seriesPerX: Record<string, Array<{ series: string; value: number }>> = {};
  if (cfg.seriesField) {
    for (const row of rows) {
      const x = String(row[cfg.xField]);
      (seriesPerX[x] ??= []).push({
        series: String(row[cfg.seriesField]),
        value: Number(row[cfg.yField]),
      });
    }
  }

  return (
    <div className={styles.barChartWrap}>
      {cfg.title && (
        <div style={{ fontFamily: "var(--serif)", fontSize: "1.0625rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.75rem" }}>
          {cfg.title}
        </div>
      )}
      <div className={styles.barArea}>
        {xValues.map(x => {
          const total = stacked[x] ?? 0;
          const pct = (total / maxY) * 100;

          if (cfg.seriesField && domain) {
            const segments = seriesPerX[x] ?? [];
            return (
              <div key={x} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: `${pct}%`, minWidth: 0 }}>
                {segments.map((seg, i) => {
                  const segPct = total > 0 ? (seg.value / total) * 100 : 0;
                  const colorIdx = domain.indexOf(seg.series);
                  return (
                    <div
                      key={i}
                      className={styles.bar}
                      style={{
                        height: `${segPct}%`,
                        background: palette[colorIdx >= 0 ? colorIdx : i] ?? palette[0],
                        opacity: 0.7,
                        borderRadius: i === 0 ? "1px 1px 0 0" : 0,
                      }}
                    />
                  );
                })}
              </div>
            );
          }

          return (
            <div
              key={x}
              className={styles.bar}
              style={{ height: `${pct}%`, background: palette[0], opacity: 0.7 }}
            />
          );
        })}
      </div>
      <div className={styles.barLabels}>
        {xValues.map(x => (
          <div key={x} className={styles.barLabel}>{x}</div>
        ))}
      </div>
      {domain && (
        <div className={styles.barLegend}>
          {domain.map((label, i) => (
            <span key={label} className={styles.barLegendItem}>
              <span className={styles.barLegendSwatch} style={{ background: palette[i % palette.length] }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
