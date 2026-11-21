/**
 * Colour scales. Pure functions, no DOM, no React, no Plot.
 *
 * Moved here from `Dashboard/color-scales.ts` on 2026-11-21 so the report site's
 * server-side renderer can use the same ones. That file is now a re-export shim.
 */

import type { ColorBreak } from "./palettes.ts";

export type { ColorBreak };

export function sequentialScale(
  breaks: readonly ColorBreak[],
): (value: number) => string {
  return (value) => {
    for (let i = breaks.length - 1; i >= 0; i--) {
      if (value >= breaks[i].value) return breaks[i].color;
    }
    return breaks[0].color;
  };
}

export function geometricBreaks(
  min: number,
  max: number,
  steps: number,
): number[] {
  if (min <= 0) min = 1;
  const ratio = Math.pow(max / min, 1 / steps);
  const breaks: number[] = [];
  for (let i = 1; i < steps; i++) {
    breaks.push(Math.round(min * Math.pow(ratio, i)));
  }
  return breaks;
}

export function divergingScale(
  negativeColor: string,
  neutralColor: string,
  positiveColor: string,
): (value: number, maxAbs: number) => string {
  return (value, maxAbs) => {
    if (maxAbs === 0) return neutralColor;
    const t = Math.abs(value) / maxAbs;
    const opacity = Math.round(t * 255)
      .toString(16)
      .padStart(2, "0");
    if (value > 0) return positiveColor + opacity;
    if (value < 0) return negativeColor + opacity;
    return neutralColor;
  };
}

export function buildMapLibreStepExpression(
  field: string,
  breaks: readonly ColorBreak[],
): unknown[] {
  const expr: unknown[] = ["step", ["get", field], breaks[0].color];
  for (let i = 1; i < breaks.length; i++) {
    expr.push(breaks[i].value, breaks[i].color);
  }
  return expr;
}

/**
 * Equal-width bins over a numeric array.
 *
 * Here rather than left to Plot's own binning because the distribution charts draw several
 * series on ONE set of bin edges: per-series binning would give each its own edges and the
 * overlay would compare things that are not the same width.
 */
export function histogram(
  values: readonly number[],
  bins = 40,
  domain?: [number, number],
): Array<{ x0: number; x1: number; mid: number; count: number; density: number }> {
  if (!values.length) return [];
  const lo = domain ? domain[0] : Math.min(...values);
  const hi = domain ? domain[1] : Math.max(...values);
  const width = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    if (v < lo || v > hi) continue;
    const i = Math.min(bins - 1, Math.floor((v - lo) / width));
    counts[i] += 1;
  }
  const total = values.length;
  return counts.map((count, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    mid: lo + (i + 0.5) * width,
    count,
    density: count / total / width,
  }));
}

/** mean, standard deviation, and the share of |v| over a threshold. */
export function stats(
  values: readonly number[],
  saturatedAbove = 0.97,
): { mean: number; std: number; saturated: number } {
  if (!values.length) return { mean: 0, std: 0, saturated: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
  const saturated =
    values.filter((v) => Math.abs(v) > saturatedAbove).length / values.length;
  return { mean, std: Math.sqrt(variance), saturated };
}
