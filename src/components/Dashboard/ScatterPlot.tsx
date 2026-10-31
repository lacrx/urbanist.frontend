import { useEffect, useRef, useCallback } from "react";
import * as Plot from "@observablehq/plot";
import "./dashboard-tokens.module.css";
import * as styles from "./scatter-plot.module.css";
import type { LinkedSelection } from "./types";

export type ScatterPoint = {
  tractId: string;
  name: string;
  x: number;
  y: number;
};

type Props = {
  data: ScatterPoint[];
  selection: LinkedSelection;
  xLabel?: string;
  yLabel?: string;
  heading?: string;
  subheading?: string;
  xRef?: number;
  yRef?: number;
  height?: number;
};

export default function ScatterPlot({
  data,
  selection,
  xLabel,
  yLabel,
  heading,
  subheading,
  xRef,
  yRef,
  height = 300,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scalesRef = useRef<{ x: (v: number) => number; y: (v: number) => number } | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const activeId = selection.activeUnit;

  const findNearest = useCallback(
    (clientX: number, clientY: number): string | null => {
      const container = containerRef.current;
      const scales = scalesRef.current;
      if (!container || !scales) return null;

      const svg = container.querySelector("svg");
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const cx = scales.x(clientX - rect.left);
      const cy = scales.y(clientY - rect.top);

      let nearest: string | null = null;
      let minDist = Infinity;

      for (const pt of dataRef.current) {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = pt.tractId;
        }
      }
      return nearest;
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data.length) return;

    const width = container.clientWidth;
    const marks: Plot.Markish[] = [];

    if (yRef != null) {
      marks.push(
        Plot.ruleY([yRef], { stroke: "var(--dash-neutral)", strokeDasharray: "4,3", strokeWidth: 1 }),
      );
    }
    if (xRef != null) {
      marks.push(
        Plot.ruleX([xRef], { stroke: "var(--dash-neutral)", strokeDasharray: "4,3", strokeWidth: 1 }),
      );
    }

    const bg = data.filter((d) => d.tractId !== activeId);
    const fg = data.filter((d) => d.tractId === activeId);

    marks.push(
      Plot.dot(bg, {
        x: "x",
        y: "y",
        r: 5,
        fill: (d: ScatterPoint) =>
          d.y >= (yRef ?? 0) ? "var(--dash-positive)" : "var(--dash-negative)",
        fillOpacity: 0.5,
        stroke: "#fff",
        strokeWidth: 1,
      }),
    );

    if (fg.length) {
      marks.push(
        Plot.dot(fg, {
          x: "x",
          y: "y",
          r: 8,
          fill: "var(--dash-accent)",
          stroke: "#fff",
          strokeWidth: 2,
        }),
        Plot.text(fg, {
          x: "x",
          y: "y",
          text: "name",
          dy: -14,
          fill: "var(--dash-accent)",
          fontWeight: 700,
          fontSize: 11,
        }),
      );
    }

    const plot = Plot.plot({
      width,
      height: Math.max(height, 200),
      marginBottom: 40,
      marginLeft: 55,
      marginRight: 20,
      marginTop: 20,
      x: {
        label: xLabel ?? null,
        labelArrow: "none",
        grid: true,
      },
      y: {
        label: yLabel ?? null,
        labelArrow: "none",
        grid: true,
      },
      marks,
      style: { fontFamily: "var(--sans)", fontSize: "12px" },
    });

    const xScale = plot.scale("x");
    const yScale = plot.scale("y");
    if (xScale && yScale && xScale.range && yScale.range && xScale.domain && yScale.domain) {
      const [xr0, xr1] = xScale.range as [number, number];
      const [xd0, xd1] = xScale.domain as [number, number];
      const [yr0, yr1] = yScale.range as [number, number];
      const [yd0, yd1] = yScale.domain as [number, number];
      scalesRef.current = {
        x: (px: number) => xd0 + ((px - xr0) / (xr1 - xr0)) * (xd1 - xd0),
        y: (py: number) => yd0 + ((py - yr0) / (yr1 - yr0)) * (yd1 - yd0),
      };
    }

    container.replaceChildren(plot);
    return () => plot.remove();
  }, [data, activeId, xLabel, yLabel, xRef, yRef, height]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const tract = findNearest(e.clientX, e.clientY);
      selection.onHover(tract);
    },
    [findNearest, selection],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const tract = findNearest(e.clientX, e.clientY);
      selection.onSelect(tract);
    },
    [findNearest, selection],
  );

  const handlePointerLeave = useCallback(() => {
    selection.onHover(null);
  }, [selection]);

  return (
    <div className={styles.section}>
      {heading && (
        <div className={styles.heading}>
          <h3 className={styles.title}>{heading}</h3>
          {subheading && <p className={styles.subtitle}>{subheading}</p>}
        </div>
      )}
      <div
        ref={containerRef}
        className={styles.chartWrap}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}
