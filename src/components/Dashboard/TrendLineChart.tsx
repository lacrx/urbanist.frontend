import { useEffect, useRef, useCallback } from "react";
import * as Plot from "@observablehq/plot";
import * as styles from "./trend-line-chart.module.css";
import SectionHeading from "./SectionHeading";
import { repositionYAxis } from "./chart-utils";
import type { LinkedSelection } from "./types";
import type { NeighborhoodColorMap } from "./neighborhood-colors";
import { neighborhoodColor, isColoredNeighborhood } from "./neighborhood-colors";
import { NEUTRAL } from "./palette";

export type TrendPoint = {
  year: number;
  value: number;
  tractId: string;
  name: string;
};

type Props = {
  data: TrendPoint[];
  selection: LinkedSelection;
  colorMap?: NeighborhoodColorMap;
  heading?: string;
  subheading?: string;
  height?: number;
};

const MAX_DIRECT_LABELS = 5;

export default function TrendLineChart({
  data,
  selection,
  colorMap,
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
    const useColorMap = colorMap && colorMap.size > 0;

    const marks: Plot.Markish[] = [Plot.ruleY([0])];

    if (useColorMap) {
      const bgColored = bg.map((d) => ({
        ...d,
        _color: neighborhoodColor(colorMap, d.tractId),
      }));

      marks.push(
        Plot.line(
          bgColored.filter((d) => isColoredNeighborhood(colorMap, d.tractId)),
          {
            x: "year",
            y: "value",
            z: "tractId",
            stroke: "_color",
            strokeWidth: 1.5,
            strokeOpacity: 0.6,
            curve: "catmull-rom",
          },
        ),
        Plot.line(
          bgColored.filter((d) => !isColoredNeighborhood(colorMap, d.tractId)),
          {
            x: "year",
            y: "value",
            z: "tractId",
            stroke: NEUTRAL,
            strokeWidth: 1,
            strokeOpacity: 0.2,
            curve: "catmull-rom",
          },
        ),
      );

      const topIds = [...colorMap.entries()]
        .filter(([, c]) => c !== NEUTRAL)
        .map(([id]) => id)
        .filter((id) => id !== activeId);
      const maxYear = Math.max(...data.map((d) => d.year));
      const endPoints = topIds
        .map((id) => data.filter((d) => d.tractId === id && d.year === maxYear)[0])
        .filter(Boolean)
        .sort((a, b) => b.value - a.value)
        .slice(0, MAX_DIRECT_LABELS);

      if (endPoints.length) {
        marks.push(
          Plot.text(endPoints, {
            x: "year",
            y: "value",
            text: (d: TrendPoint) => d.name,
            dx: 6,
            fill: (d: TrendPoint) => neighborhoodColor(colorMap, d.tractId),
            fontSize: 9,
            fontWeight: 600,
            textAnchor: "start",
          }),
        );
      }

      if (fg.length) {
        const fgColor = isColoredNeighborhood(colorMap, activeId!)
          ? neighborhoodColor(colorMap, activeId!)
          : "var(--dash-accent)";
        marks.push(
          Plot.line(fg, {
            x: "year",
            y: "value",
            stroke: fgColor,
            strokeWidth: 2.5,
            curve: "catmull-rom",
          }),
          Plot.dot(fg, {
            x: "year",
            y: "value",
            fill: fgColor,
            r: 3.5,
          }),
          Plot.text([fg[fg.length - 1]], {
            x: "year",
            y: "value",
            text: (d: TrendPoint) => `${d.name}  ${d.value}`,
            dx: 8,
            fill: fgColor,
            fontWeight: 700,
            fontSize: 12,
            textAnchor: "start",
          }),
        );
      }
    } else {
      marks.push(
        Plot.line(bg, {
          x: "year",
          y: "value",
          z: "tractId",
          stroke: "var(--dash-neutral)",
          strokeWidth: 1,
          strokeOpacity: 0.3,
          curve: "catmull-rom",
        }),
      );

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
          Plot.text([fg[fg.length - 1]], {
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
    }

    const ml = 40;
    const mr = useColorMap ? 100 : 0;
    const plot = Plot.plot({
      width,
      height: Math.max(height, 180),
      marginBottom: 40,
      marginLeft: ml,
      marginRight: mr,
      x: {
        label: null,
        tickFormat: (d: unknown) => String(d),
      },
      y: {
        label: "Units",
        labelArrow: "none",
        grid: true,
      },
      color: useColorMap ? { type: "identity" } : undefined,
      marks,
    });

    repositionYAxis(plot, ml);

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
  }, [data, activeId, height, colorMap]);

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
    <div>
      {heading && <SectionHeading title={heading} subtitle={subheading} />}
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
