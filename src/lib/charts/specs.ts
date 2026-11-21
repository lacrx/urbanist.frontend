/**
 * The chart lexicon: data plus a config in, an Observable Plot spec out.
 *
 * **Nothing here touches React or the DOM.** A spec is a plain object, so the same builder
 * serves a browser component (`Plot.plot(spec)` into a ref) and the report site's
 * server-side renderer (`Plot.plot({...spec, document})` from jsdom, written out as SVG).
 * That is the whole reason this layer exists: the mount differs between the two consumers
 * and the chart does not, so only the mount should be written twice.
 *
 * Two families:
 *
 *  - The ones this repository already drew: `bar`, `scatter`, `line`.
 *  - The diagnostic ones, added 2026-11-21, taken from the plots Karpathy actually uses in
 *    the Zero-to-Hero series and argues for in "A Recipe for Training Neural Networks":
 *    `loss`, `distributions`, `ratio`, `heatmap`, `embedding`. Each is noted with what it
 *    is for, because a chart type nobody can say the purpose of gets used for the wrong
 *    question.
 */

import * as Plot from "@observablehq/plot";
import type { Palette } from "./palettes.ts";
import { palette as resolvePalette, seriesColor } from "./palettes.ts";
import { histogram, stats } from "./scales.ts";

export type Row = Record<string, string | number | null | undefined>;

export type BaseOptions = {
  palette?: string | Palette;
  width?: number;
  height?: number;
  title?: string;
  caption?: string;
  xLabel?: string;
  yLabel?: string;
  marginLeft?: number;
  marginBottom?: number;
};

function pal(o: BaseOptions): Palette {
  return typeof o.palette === "object" && o.palette !== null
    ? o.palette
    : resolvePalette((o.palette as string) ?? "web");
}

/** Everything every chart shares: the page it sits on, not the data. */
function frame(o: BaseOptions, p: Palette) {
  return {
    width: o.width ?? 720,
    height: o.height ?? 320,
    marginLeft: o.marginLeft ?? 52,
    marginBottom: o.marginBottom ?? 40,
    marginTop: 18,
    marginRight: 18,
    style: {
      background: p.ink.background,
      color: p.ink.text,
      fontSize: "12px",
      // Monospace deliberately: these are read next to numbers in tables and code, and a
      // proportional face makes columns of digits ragged.
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
    caption: o.caption,
  };
}

function grid(p: Palette) {
  return { grid: true, line: true, stroke: p.ink.grid };
}

/* ----------------------------------------------------------------- bar */

export type BarOptions = BaseOptions & {
  x: string;
  y: string;
  series?: string;
  mode?: "stacked" | "grouped";
  domain?: string[];
};

export function bar(rows: Row[], o: BarOptions) {
  const p = pal(o);
  const domain =
    o.domain ??
    (o.series ? [...new Set(rows.map((r) => String(r[o.series!])))] : undefined);

  const mark =
    o.mode === "grouped" && o.series
      ? Plot.barY(
          rows,
          Plot.groupX({ y: "sum" }, { x: o.x, y: o.y, fill: o.series }),
        )
      : o.series
        ? Plot.barY(rows, Plot.stackY({ x: o.x, y: o.y, fill: o.series }))
        : Plot.barY(rows, { x: o.x, y: o.y, fill: seriesColor(p, 0) });

  return {
    ...frame(o, p),
    x: { label: o.xLabel ?? o.x, type: "band" as const },
    y: { label: o.yLabel ?? o.y, ...grid(p) },
    color: domain
      ? { domain, range: domain.map((_, i) => seriesColor(p, i)), legend: true }
      : undefined,
    marks: [Plot.ruleY([0], { stroke: p.ink.grid }), mark],
  };
}

/* ------------------------------------------------------------- scatter */

export type ScatterOptions = BaseOptions & {
  x: string;
  y: string;
  series?: string;
  label?: string;
  r?: string | number;
};

export function scatter(rows: Row[], o: ScatterOptions) {
  const p = pal(o);
  const domain = o.series
    ? [...new Set(rows.map((r) => String(r[o.series!])))]
    : undefined;

  const marks: Plot.Markish[] = [
    Plot.dot(rows, {
      x: o.x,
      y: o.y,
      fill: o.series ?? seriesColor(p, 0),
      r: typeof o.r === "number" ? o.r : (o.r ?? 3.5),
      fillOpacity: 0.85,
    }),
  ];
  if (o.label) {
    marks.push(
      Plot.text(rows, { x: o.x, y: o.y, text: o.label, dy: -9, fill: p.ink.muted }),
    );
  }

  return {
    ...frame(o, p),
    x: { label: o.xLabel ?? o.x, ...grid(p) },
    y: { label: o.yLabel ?? o.y, ...grid(p) },
    color: domain
      ? { domain, range: domain.map((_, i) => seriesColor(p, i)), legend: true }
      : undefined,
    marks,
  };
}

/* ---------------------------------------------------------------- line */

export type LineOptions = BaseOptions & {
  x: string;
  y: string;
  series?: string;
  logY?: boolean;
};

export function line(rows: Row[], o: LineOptions) {
  const p = pal(o);
  const domain = o.series
    ? [...new Set(rows.map((r) => String(r[o.series!])))]
    : undefined;

  return {
    ...frame(o, p),
    x: { label: o.xLabel ?? o.x, ...grid(p) },
    y: {
      label: o.yLabel ?? o.y,
      type: o.logY ? ("log" as const) : undefined,
      ...grid(p),
    },
    color: domain
      ? { domain, range: domain.map((_, i) => seriesColor(p, i)), legend: true }
      : undefined,
    marks: [
      Plot.line(rows, {
        x: o.x,
        y: o.y,
        stroke: o.series ?? seriesColor(p, 0),
        strokeWidth: 1.6,
      }),
    ],
  };
}

/* ------------------------------------------- loss curve (train vs val) */

/**
 * Two curves on one axis, with the best validation point marked.
 *
 * The single most-looked-at plot in the Zero-to-Hero series, and the one whose whole value
 * is the GAP between the curves: training loss falling while validation turns back up is
 * overfitting, and nothing else on the page says so. The marked minimum is there because
 * "where did it stop improving" is the question actually being asked, and reading it off a
 * line by eye is how people land two thousand steps late.
 *
 * `logY` because loss spans orders of magnitude early and a linear axis spends most of its
 * height on the first fifty steps.
 */
export type LossOptions = BaseOptions & {
  x?: string;
  y?: string;
  series?: string;
  logY?: boolean;
  markBest?: boolean;
};

export function loss(rows: Row[], o: LossOptions = {}) {
  const p = pal(o);
  const x = o.x ?? "step";
  const y = o.y ?? "loss";
  const s = o.series ?? "split";
  const domain = [...new Set(rows.map((r) => String(r[s])))];

  const marks: Plot.Markish[] = [
    Plot.line(rows, { x, y, stroke: s, strokeWidth: 1.6 }),
  ];

  if (o.markBest !== false) {
    const val = rows.filter((r) => /val/i.test(String(r[s])));
    const pool = val.length ? val : rows;
    const best = pool.reduce((a, b) => (Number(a[y]) <= Number(b[y]) ? a : b));
    // Put the label on whichever side of the rule has room. Anchoring it `start`
    // unconditionally clipped it against the right margin whenever the best point fell late
    // in the run, which is exactly when it happens on a model that trained well.
    const xs = rows.map((r) => Number(r[x]));
    const late = Number(best[x]) > (Math.min(...xs) + Math.max(...xs)) / 2;
    marks.push(
      Plot.ruleX([best[x]], { stroke: p.ink.reference, strokeDasharray: "3,3" }),
      Plot.dot([best], { x, y, r: 4, fill: p.ink.reference }),
      Plot.text([best], {
        x,
        y,
        text: () => `best ${Number(best[y]).toFixed(4)} @ ${best[x]}`,
        dy: -12,
        fill: p.ink.reference,
        textAnchor: late ? "end" : "start",
        dx: late ? -6 : 6,
      }),
    );
  }

  return {
    ...frame(o, p),
    x: { label: o.xLabel ?? x, ...grid(p) },
    y: {
      label: o.yLabel ?? y,
      type: o.logY ? ("log" as const) : undefined,
      ...grid(p),
    },
    color: { domain, range: domain.map((_, i) => seriesColor(p, i)), legend: true },
    marks,
  };
}

/* ------------------------------------------- layer distributions */

/**
 * One density curve per layer, on shared bin edges, with mean/std/saturation in the legend.
 *
 * This is the activations-and-gradients diagnostic from makemore part 3. The thing it
 * catches is a distribution that has quietly collapsed or saturated: a tanh layer whose mass
 * has piled up at ±1 is dead, and it looks completely fine in a loss curve for a long time.
 *
 * The bins are computed ONCE across every series (`scales.histogram` with a shared domain)
 * rather than per series, because per-series edges would put curves of different widths on
 * one axis and the comparison would be meaningless.
 */
export type DistributionsOptions = BaseOptions & {
  bins?: number;
  saturatedAbove?: number;
  /** Draw the ±threshold lines that define saturation. */
  showSaturation?: boolean;
};

export function distributions(
  series: Array<{ name: string; values: number[] }>,
  o: DistributionsOptions = {},
) {
  const p = pal(o);
  const all = series.flatMap((s) => s.values);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const bins = o.bins ?? 60;
  const sat = o.saturatedAbove ?? 0.97;

  const rows: Array<{ x: number; density: number; layer: string }> = [];
  const legend: string[] = [];
  for (const s of series) {
    const st = stats(s.values, sat);
    const name = `${s.name}  mean ${st.mean.toFixed(2)} std ${st.std.toFixed(2)} sat ${(
      st.saturated * 100
    ).toFixed(1)}%`;
    legend.push(name);
    for (const b of histogram(s.values, bins, [lo, hi])) {
      rows.push({ x: b.mid, density: b.density, layer: name });
    }
  }

  const marks: Plot.Markish[] = [
    Plot.line(rows, { x: "x", y: "density", stroke: "layer", strokeWidth: 1.4 }),
  ];
  if (o.showSaturation !== false && hi >= sat) {
    marks.push(
      Plot.ruleX([-sat, sat], {
        stroke: p.ink.reference,
        strokeDasharray: "2,3",
        strokeOpacity: 0.8,
      }),
    );
  }

  return {
    ...frame({ ...o, height: o.height ?? 300 }, p),
    x: { label: o.xLabel ?? "value", ...grid(p) },
    y: { label: o.yLabel ?? "density", ...grid(p) },
    color: {
      domain: legend,
      range: legend.map((_, i) => seriesColor(p, i)),
      legend: true,
    },
    marks,
  };
}

/* ------------------------------------------------- ratio over time */

/**
 * Many series over training steps against a dashed reference line.
 *
 * The update:data ratio plot: log10(std of the update / std of the parameter) per layer per
 * step, with a reference at -3. It answers "is the learning rate right" in one picture,
 * which no loss curve does: curves sitting far above the line mean the weights are being
 * rewritten every step, far below means nothing is moving.
 *
 * Generalised rather than hardcoded to that one use, because "several series and a threshold
 * everyone is really looking at" is a shape, not a special case.
 */
export type RatioOptions = BaseOptions & {
  x?: string;
  y?: string;
  series?: string;
  reference?: number | null;
  referenceLabel?: string;
};

export function ratio(rows: Row[], o: RatioOptions = {}) {
  const p = pal(o);
  const x = o.x ?? "step";
  const y = o.y ?? "ratio";
  const s = o.series ?? "layer";
  const domain = [...new Set(rows.map((r) => String(r[s])))];
  const ref = o.reference === undefined ? -3 : o.reference;

  const marks: Plot.Markish[] = [
    Plot.line(rows, { x, y, stroke: s, strokeWidth: 1.3, strokeOpacity: 0.9 }),
  ];
  if (ref !== null) {
    marks.push(
      Plot.ruleY([ref], { stroke: p.ink.reference, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: Math.max(...rows.map((r) => Number(r[x]))),
        y: ref,
        text: () => o.referenceLabel ?? String(ref),
        dy: -6,
        dx: -4,
        textAnchor: "end",
        fill: p.ink.reference,
      }),
    );
  }

  return {
    ...frame(o, p),
    x: { label: o.xLabel ?? x, ...grid(p) },
    y: { label: o.yLabel ?? y, ...grid(p) },
    color: { domain, range: domain.map((_, i) => seriesColor(p, i)), legend: true },
    marks,
  };
}

/* ------------------------------------------------------------ heatmap */

/**
 * A labelled matrix: one cell per (row, column), coloured by value, with the value printed
 * in the cell.
 *
 * The bigram count matrix from makemore part 1. The printed number is the point and is what
 * separates this from a decorative heatmap: the colour gives you the shape at a glance and
 * the text lets you read the actual value without a tooltip, which matters because a report
 * is often read as a static page or on paper.
 */
export type HeatmapOptions = BaseOptions & {
  x?: string;
  y?: string;
  value?: string;
  showValues?: boolean;
  /** Printed in each cell; defaults to the value, rounded. */
  format?: (v: number) => string;
  /**
   * Off by default. A continuous colour ramp legend is drawn to a canvas, which the
   * server-side renderer has no implementation of, and the printed cell values make it
   * close to redundant anyway. Turn it on for a browser mount if the shape alone is the
   * point.
   */
  legend?: boolean;
};

export function heatmap(rows: Row[], o: HeatmapOptions = {}) {
  const p = pal(o);
  const x = o.x ?? "x";
  const y = o.y ?? "y";
  const v = o.value ?? "value";
  const fmt = o.format ?? ((n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2)));

  const marks: Plot.Markish[] = [
    Plot.cell(rows, { x, y, fill: v, inset: 0.5 }),
  ];
  if (o.showValues !== false) {
    marks.push(
      Plot.text(rows, {
        x,
        y,
        text: (d: Row) => fmt(Number(d[v])),
        // Dark text on the bright end of the ramp, light on the dim end, so the number is
        // readable in every cell rather than only the middle ones.
        fill: (d: Row) =>
          Number(d[v]) > 0.6 * Math.max(...rows.map((r) => Number(r[v])))
            ? p.ink.surface
            : p.ink.text,
        fontSize: 10,
      }),
    );
  }

  return {
    ...frame({ ...o, height: o.height ?? 420, marginLeft: o.marginLeft ?? 60 }, p),
    x: { label: o.xLabel ?? null, type: "band" as const, tickSize: 0 },
    y: { label: o.yLabel ?? null, type: "band" as const, tickSize: 0 },
    color: {
      type: "linear" as const,
      range: [...p.sequential],
      legend: o.legend === true,
    },
    marks,
  };
}

/* ---------------------------------------------------------- embedding */

/**
 * A scatter where the LABEL is the mark: every point carries its name.
 *
 * The 2D character-embedding plot from makemore part 4. A dot plot of an embedding tells you
 * almost nothing; the clusters only mean something once you can read which tokens fell
 * together, so the text is drawn instead of a legend and the dot is only a locator.
 */
export type EmbeddingOptions = BaseOptions & {
  x?: string;
  y?: string;
  label?: string;
  series?: string;
};

export function embedding(rows: Row[], o: EmbeddingOptions = {}) {
  const p = pal(o);
  const x = o.x ?? "x";
  const y = o.y ?? "y";
  const label = o.label ?? "label";
  const domain = o.series
    ? [...new Set(rows.map((r) => String(r[o.series!])))]
    : undefined;

  return {
    ...frame({ ...o, height: o.height ?? 420 }, p),
    x: { label: o.xLabel ?? null, ...grid(p) },
    y: { label: o.yLabel ?? null, ...grid(p) },
    color: domain
      ? { domain, range: domain.map((_, i) => seriesColor(p, i)), legend: true }
      : undefined,
    marks: [
      Plot.dot(rows, {
        x,
        y,
        r: 2,
        fill: o.series ?? p.ink.muted,
        fillOpacity: 0.7,
      }),
      Plot.text(rows, {
        x,
        y,
        text: label,
        fill: o.series ?? p.ink.text,
        fontSize: 12,
        dy: -8,
      }),
    ],
  };
}

export const SPECS = {
  bar,
  scatter,
  line,
  loss,
  distributions,
  ratio,
  heatmap,
  embedding,
} as const;

export type SpecName = keyof typeof SPECS;
