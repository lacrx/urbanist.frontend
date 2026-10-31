import { useEffect, useRef, useCallback } from "react";
import * as Plot from "@observablehq/plot";
import "./dashboard-tokens.module.css";
import * as styles from "./trend-line-chart.module.css";
import type { LinkedSelection } from "./types";

export type TrendPoint = {
  year: number;
  value: number;
  tractId: string;
  name: string;
};

type Props = {
  data: TrendPoint[];
  selection: LinkedSelection;
  heading?: string;
  subheading?: string;
  height?: number;
};

export default function TrendLineChart({
  data,
  selection,
  heading,
  subheading,
  height = 260,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scalesRef = useRef<{ x: (v: number) => number; y: (v: number) => number } | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const activeId = selection.activeUnit;

  const findNearestTract = useCallback(
    (clientX: number, clientY: number): string | null => {
      const container = containerRef.current;
      const scales = scalesRef.current;
      if (!container || !scales) return null;

      const svg = container.querySelector("svg");
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const cursorYear = Math.round(scales.x(x));
      const cursorValue = scales.y(y);

      let nearest: string | null = null;
      let minDist = Infinity;

      for (const pt of dataRef.current) {
        if (pt.year !== cursorYear) continue;
        const dist = Math.abs(pt.value - cursorValue);
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
    const bg = data.filter((d) => d.tractId !== activeId);
    const fg = data.filter((d) => d.tractId === activeId);

    const marks: Plot.Markish[] = [
      Plot.ruleY([0]),
      Plot.line(bg, {
        x: "year",
        y: "value",
        z: "tractId",
        stroke: "#9ca3af",
        strokeWidth: 1,
        strokeOpacity: 0.3,
        curve: "catmull-rom",
      }),
    ];

    if (fg.length) {
      marks.push(
        Plot.line(fg, {
          x: "year",
          y: "value",
          stroke: "var(--dash-accent)",
          strokeWidth: 2.5,
          curve: "catmull-rom",
        }),
        Plot.dot(fg, {
          x: "year",
          y: "value",
          fill: "var(--dash-accent)",
          r: 3.5,
        }),
        Plot.text(fg.filter((_, i, arr) => i === arr.length - 1), {
          x: "year",
          y: "value",
          text: (d: TrendPoint) => String(d.value),
          dx: 8,
          fill: "var(--dash-accent)",
          fontWeight: 700,
          fontSize: 12,
        }),
      );
    }

    const plot = Plot.plot({
      width,
      height: Math.max(height, 180),
      marginBottom: 30,
      marginLeft: 50,
      marginRight: 40,
      x: {
        label: null,
        tickFormat: (d: unknown) => String(d),
      },
      y: {
        label: "Units",
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
  }, [data, activeId, height]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const tract = findNearestTract(e.clientX, e.clientY);
      selection.onHover(tract);
    },
    [findNearestTract, selection],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const tract = findNearestTract(e.clientX, e.clientY);
      selection.onSelect(tract);
    },
    [findNearestTract, selection],
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
