#!/usr/bin/env -S node --experimental-strip-types --no-warnings
/**
 * Render a chart to inline SVG for a report.
 *
 * The chart lexicon is NOT defined here. It lives in `src/lib/charts/`, which is
 * framework-free on purpose: the
 * dashboards mount a spec into a React ref, and this renders the same spec to SVG in Node.
 * Only the mount is written twice; the chart is written once. Node 22's type stripping is
 * what lets this import the TypeScript source with no build step.
 *
 * Output is a plain <svg> with no script and no external request, so a report stays static
 * HTML that works offline, prints, and needs nothing from a CDN.
 *
 * Driven through `~/.local/bin/report-chart` on workhorse, which is a wrapper around this.
 *
 * Usage:
 *   report-chart spec.json                 # SVG on stdout
 *   report-chart spec.json -o chart.svg
 *   echo '{"type":"bar",...}' | report-chart -
 *   report-chart --list                    # the lexicon
 *   report-chart --demo loss               # a worked example of one type
 *
 * A spec is {"type": <name>, "data": <rows|series>, "options": {...}}.
 * `options.palette` defaults to "gruvbox", which is the report site's theme.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as Plot from "@observablehq/plot";
import { SPECS } from "../src/lib/charts/index.ts";

const NAMES = Object.keys(SPECS);

function die(msg) {
  process.stderr.write(`report-chart: ${msg}\n`);
  process.exit(1);
}

/**
 * Wrap Plot's output as one <figure class="report-chart">.
 *
 * Plot already returns a <figure> when there is a legend or a caption, and a bare <svg>
 * otherwise. Wrapping unconditionally nested a figure inside a figure. Sizing is NOT inlined
 * here: `.report-chart svg` in /report.css makes it responsive, so a chart obeys the report's
 * stylesheet like everything else rather than carrying its own layout.
 */
function wrap(markup, title) {
  const cap = title ? `<figcaption>${escapeHtml(title)}</figcaption>\n` : "";
  if (/^\s*<figure\b/.test(markup)) {
    return markup.replace(
      /^(\s*<figure\b)([^>]*)>/,
      (_m, open, attrs) =>
        `${open}${attrs.replace(/class="([^"]*)"/, 'class="$1 report-chart"')}${
          /class=/.test(attrs) ? "" : ' class="report-chart"'
        }>\n${cap}`,
    );
  }
  return `<figure class="report-chart">\n${cap}${markup}\n</figure>`;
}

function render(spec) {
  const { type, data, options = {} } = spec;
  if (!type || !NAMES.includes(type)) {
    die(`unknown chart type ${JSON.stringify(type)}; have ${NAMES.join(", ")}`);
  }
  if (!Array.isArray(data) || data.length === 0) {
    die("spec has no data");
  }

  const built = SPECS[type](data, { palette: "gruvbox", ...options });

  // A CONTINUOUS colour legend is a ramp, and Plot draws a ramp onto a canvas. jsdom has no
  // canvas, so it throws "Cannot set properties of null (setting 'fillStyle')" from deep
  // inside Plot, which reads like a bug in the chart rather than a missing capability of the
  // renderer. Dropping the legend keeps the chart; installing the native `canvas` package to
  // get a colour bar on a static page is not a trade worth making. Ordinal legends are
  // swatches and are unaffected.
  const colorScale = built.color;
  if (
    colorScale &&
    colorScale.legend &&
    !Array.isArray(colorScale.domain) &&
    ["linear", "log", "sqrt", "pow", "symlog", "quantile", "quantize"].includes(
      colorScale.type ?? "",
    )
  ) {
    process.stderr.write(
      `report-chart: dropped the continuous colour legend on "${type}" (no canvas in this renderer)\n`,
    );
    built.color = { ...colorScale, legend: false };
  }

  // Plot needs a document to build nodes in. jsdom rather than a browser: this runs on a
  // headless server and the output is static, so there is nothing to lay out or measure.
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const figure = Plot.plot({ ...built, document: dom.window.document });

  const markup = figure.outerHTML;
  if (!markup || !markup.includes("<svg")) {
    die(`Plot produced no SVG for type ${type}`);
  }

  // The title becomes a <figcaption> rather than a Plot title: it is read by a screen reader
  // and survives the chart being copied out of the page.
  return wrap(markup, options.title ?? spec.title);
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

/* ----------------------------------------------------------------- demos */

function demo(name) {
  const rnd = mulberry32(7); // fixed seed: a demo that moves is not a reference
  const normal = (mean, std) => {
    const u = 1 - rnd(), v = rnd();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  switch (name) {
    case "loss": {
      const data = [];
      for (let step = 0; step <= 2000; step += 50) {
        const t = step / 2000;
        data.push({ step, split: "train", loss: 2.6 * Math.exp(-2.6 * t) + 0.42 + normal(0, 0.012) });
        // Validation has to actually turn back up, or the caption describes a bump the
        // chart does not show. A demo whose picture contradicts its own words teaches the
        // wrong thing about the chart type.
        data.push({ step, split: "val", loss: 2.6 * Math.exp(-3.4 * t) + 0.46 + 1.15 * t * t + normal(0, 0.014) });
      }
      return { type: "loss", data, options: { title: "Training and validation loss", caption: "Validation turns back up near step 1200: everything after that is overfitting.", height: 300 } };
    }
    case "distributions": {
      const data = [1, 2, 3, 4, 5].map((i) => ({
        name: `layer ${i}`,
        values: Array.from({ length: 4000 }, () => Math.tanh(normal(0, 0.55 + i * 0.5))),
      }));
      return { type: "distributions", data, options: { title: "Activation distribution by layer", caption: "Deeper layers pile up at the tanh asymptotes. Saturation is the share past ±0.97.", height: 300 } };
    }
    case "ratio": {
      const data = [];
      for (let i = 1; i <= 5; i++) {
        for (let step = 0; step <= 1000; step += 25) {
          data.push({ step, layer: `layer ${i}`, ratio: -3 + (i - 3) * 0.45 + normal(0, 0.09) - 0.0003 * step });
        }
      }
      return { type: "ratio", data, options: { title: "Update to data ratio", caption: "log10(std of update / std of parameter). Far above −3 means the weights are being rewritten every step; far below means nothing is moving.", yLabel: "log10 ratio", height: 300 } };
    }
    case "heatmap": {
      const letters = "abcdefgh".split("");
      const data = [];
      for (const y of letters) for (const x of letters) {
        data.push({ x, y, value: Math.max(0, Math.round(normal(40, 38))) });
      }
      return { type: "heatmap", data, options: { title: "Bigram counts", caption: "Colour for the shape, the printed number so the value is readable without a tooltip.", height: 400 } };
    }
    case "embedding": {
      const toks = "abcdefghijklmnopqrstuvwxyz.".split("");
      const data = toks.map((label) => {
        const vowel = "aeiou".includes(label);
        return { label, x: normal(vowel ? 1.6 : -0.6, 0.6), y: normal(vowel ? 0.9 : -0.3, 0.7), kind: vowel ? "vowel" : label === "." ? "end" : "consonant" };
      });
      return { type: "embedding", data, options: { title: "Character embedding", series: "kind", caption: "The labels are the mark. A dot plot of an embedding says nothing; the clusters only mean something once you can read what fell together.", height: 380 } };
    }
    case "bar": {
      const data = [];
      for (const year of [2021, 2022, 2023, 2024, 2025]) {
        for (const kind of ["permitted", "completed"]) {
          data.push({ year: String(year), kind, units: Math.round(300 + normal(0, 90) + (kind === "completed" ? -80 : 0)) });
        }
      }
      return { type: "bar", data, options: { title: "Units by year", x: "year", y: "units", series: "kind", mode: "grouped", height: 300 } };
    }
    case "scatter": {
      const data = Array.from({ length: 120 }, () => {
        const x = rnd() * 100;
        return { x, y: 0.6 * x + normal(0, 14), group: x > 50 ? "north" : "south" };
      });
      return { type: "scatter", data, options: { title: "Scatter", x: "x", y: "y", series: "group", height: 300 } };
    }
    case "line": {
      const data = [];
      for (const s of ["a", "b"]) for (let x = 0; x <= 50; x++) {
        data.push({ x, s, y: 10 + (s === "a" ? x * 0.8 : x * 0.35) + normal(0, 2) });
      }
      return { type: "line", data, options: { title: "Line", x: "x", y: "y", series: "s", height: 280 } };
    }
    default:
      die(`no demo for ${JSON.stringify(name)}; have ${NAMES.join(", ")}`);
  }
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ main */

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
  process.stdout.write(
    `report-chart <spec.json|-> [-o out.svg]\n` +
      `  --list          the chart lexicon\n` +
      `  --demo <type>   render a worked example of one type\n` +
      `  --all-demos     every type, concatenated, for a gallery page\n\n` +
      `types: ${NAMES.join(", ")}\n`,
  );
  process.exit(0);
}

if (argv.includes("--list")) {
  process.stdout.write(NAMES.join("\n") + "\n");
  process.exit(0);
}

const outIdx = argv.findIndex((a) => a === "-o");
const outPath = outIdx >= 0 ? argv[outIdx + 1] : null;

let html;
if (argv.includes("--all-demos")) {
  html = NAMES.map((n) => render(demo(n))).join("\n\n");
} else if (argv.includes("--demo")) {
  html = render(demo(argv[argv.indexOf("--demo") + 1]));
} else {
  const src = argv[0];
  const text = src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8");
  let spec;
  try {
    spec = JSON.parse(text);
  } catch (e) {
    die(`that is not JSON: ${e.message}`);
  }
  html = Array.isArray(spec)
    ? spec.map(render).join("\n\n")
    : render(spec);
}

if (outPath) {
  writeFileSync(outPath, html + "\n");
  process.stderr.write(`report-chart: wrote ${outPath}\n`);
} else {
  process.stdout.write(html + "\n");
}
