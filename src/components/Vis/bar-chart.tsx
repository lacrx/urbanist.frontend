import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./bar-chart.module.css";

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

type BarChartData = {
  rows: Array<Record<string, string | number>>;
};

const FALLBACK_PALETTE = ["#4269d0", "#efb118", "#ff725c", "#a463f2", "#36b07e", "#e6549f", "#0bb4ff", "#54bebe"];

type Props = { artifact: GatsbyVisualization; height: number };

export default function BarChart({ artifact, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows } = (artifact.data ?? { rows: [] }) as BarChartData;
  const cfg = (artifact.config ?? { mode: "stacked", xField: "x", yField: "y" }) as BarChartConfig;

  const palette = cfg.colors ?? FALLBACK_PALETTE;
  const domain = cfg.domain ?? (cfg.seriesField ? [...new Set(rows.map(r => String(r[cfg.seriesField!])))] : undefined);
  useEffect(() => {
    if (!containerRef.current || !rows.length) return;

    const containerWidth = containerRef.current.clientWidth;
    const marks: Plot.Markish[] = [];

    if (cfg.mode === "grouped" && cfg.seriesField) {
      marks.push(
        Plot.barY(rows, Plot.groupX(
          { y: "sum" },
          { x: cfg.xField, y: cfg.yField, fill: cfg.seriesField, fx: undefined }
        ))
      );
    } else if (cfg.seriesField) {
      marks.push(
        Plot.barY(rows, Plot.stackY({
          x: cfg.xField,
          y: cfg.yField,
          fill: cfg.seriesField,
          order: "appearance",
        }))
      );
    } else {
      marks.push(
        Plot.barY(rows, { x: cfg.xField, y: cfg.yField, fill: palette[0] })
      );
    }

    marks.push(Plot.ruleY([0]));

    const plot = Plot.plot({
      width: containerWidth,
      height: Math.max(height, 200),
      marginBottom: cfg.marginBottom ?? 40,
      marginLeft: cfg.marginLeft ?? 40,
      marginRight: cfg.marginRight ?? 0,
      x: { type: "band", label: cfg.xLabel ?? null, labelArrow: "none", tickFormat: (d: unknown) => String(d) },
      y: { label: cfg.yLabel ?? null, labelArrow: "none", grid: true },
      color: domain ? { domain, range: palette.slice(0, domain.length) } : undefined,
      marks,
    });

    containerRef.current.replaceChildren(plot);

    const ml = cfg.marginLeft ?? 40;
    const tickLabelGroup = plot.querySelector('[aria-label="y-axis tick label"]');
    if (tickLabelGroup) {
      tickLabelGroup.setAttribute("text-anchor", "start");
      tickLabelGroup.setAttribute("transform", `translate(${-ml},0)`);
    }
    const axisLabelGroup = plot.querySelector('[aria-label="y-axis label"]');
    if (axisLabelGroup) {
      const prev = axisLabelGroup.getAttribute("transform") ?? "";
      const yMatch = prev.match(/translate\([^,]+,\s*([^)]+)\)/);
      const y = yMatch ? yMatch[1] : "0";
      axisLabelGroup.setAttribute("transform", `translate(${-ml},${y})`);
    }

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
              <span className={styles.legendSwatch} style={{ background: palette[i % palette.length] }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
