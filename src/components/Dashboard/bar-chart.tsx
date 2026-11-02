import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import * as styles from "./bar-chart.module.css";
import { CATEGORICAL } from "./palette";
import { repositionYAxis } from "./chart-utils";

type BarChartConfig = {
  mode: "stacked" | "grouped";
  xField: string;
  yField: string;
  seriesField?: string;
  xLabel?: string;
  yLabel?: string;
  colors?: string[];
  domain?: string[];
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  title?: string;
};

type Props = {
  rows: Array<Record<string, string | number>>;
  config: BarChartConfig;
  height?: number;
};

export default function BarChart({ rows, config: cfg, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const palette = cfg.colors ?? CATEGORICAL;
  const domain =
    cfg.domain ??
    (cfg.seriesField
      ? [...new Set(rows.map((r) => String(r[cfg.seriesField!])))]
      : undefined);

  useEffect(() => {
    if (!containerRef.current || !rows.length) return;

    const containerWidth = containerRef.current.clientWidth;
    const marks: Plot.Markish[] = [];

    if (cfg.mode === "grouped" && cfg.seriesField) {
      marks.push(
        Plot.barY(
          rows,
          Plot.groupX(
            { y: "sum" },
            { x: cfg.xField, y: cfg.yField, fill: cfg.seriesField },
          ),
        ),
      );
    } else if (cfg.seriesField) {
      marks.push(
        Plot.barY(
          rows,
          Plot.stackY({
            x: cfg.xField,
            y: cfg.yField,
            fill: cfg.seriesField,
            order: "appearance",
          }),
        ),
      );
    } else {
      marks.push(
        Plot.barY(rows, { x: cfg.xField, y: cfg.yField, fill: palette[0] }),
      );
    }

    marks.push(Plot.ruleY([0]));

    const plot = Plot.plot({
      width: containerWidth,
      height: Math.max(height, 200),
      marginBottom: cfg.marginBottom ?? 40,
      marginLeft: cfg.marginLeft ?? 40,
      marginRight: cfg.marginRight ?? 0,
      x: {
        type: "band",
        label: cfg.xLabel ?? null,
        labelArrow: "none",
        tickFormat: (d: unknown) => String(d),
      },
      y: { label: cfg.yLabel ?? null, labelArrow: "none", grid: true },
      color: domain
        ? { domain, range: palette.slice(0, domain.length) }
        : undefined,
      marks,
    });

    containerRef.current.replaceChildren(plot);

    repositionYAxis(plot, cfg.marginLeft ?? 40);

    return () => plot.remove();
  }, [rows, cfg, height, palette, domain]);

  return (
    <div>
      {cfg.title && <div className={styles.chartTitle}>{cfg.title}</div>}
      <div ref={containerRef} className={styles.container} />
      {domain && (
        <div className={styles.legend}>
          {domain.map((label, i) => (
            <span key={label} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: palette[i % palette.length] }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
