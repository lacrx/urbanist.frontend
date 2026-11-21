/**
 * Every colour a chart in this house is allowed to use, in one file.
 *
 * It was `Dashboard/palette.ts` and `Dashboard/color-scales.ts`, which were reachable only
 * from React components in this repository. The report site on workhorse
 * (`reports.lacrx.com`) renders the same chart specs server-side to SVG and needs the same
 * values; copying them there would have been a second definition of the thing this
 * repository's own rules say must have one ("Don't create ad-hoc color arrays").
 *
 * Both old paths still exist as re-export shims, so no component changed.
 *
 * **A palette is a THEME, not a constant.** `web` is the Tableau-derived set these
 * dashboards have always used, on a light page. `gruvbox` is the report site's, which has a
 * dark default. A chart spec takes a palette; it never names a colour.
 */

export type ColorBreak = { value: number; color: string; label?: string };

export type Palette = {
  /** Series colours, in order. Cycled when there are more series than entries. */
  categorical: readonly string[];
  /** Low to high, for a quantity. */
  sequential: readonly string[];
  /** Breakpoints for a choropleth or a binned legend. */
  breaks: readonly ColorBreak[];
  diverging: { negative: string; neutral: string; positive: string };
  /** Chart furniture: not data, but the page the data sits on. */
  ink: {
    text: string;
    muted: string;
    grid: string;
    surface: string;
    background: string;
    /** Drawn over data to mark a threshold or a reference value. */
    reference: string;
  };
};

/* ------------------------------------------------------------------ web */

export const BLUE_RAMP = [
  "#f0f4f8",
  "#c6d7eb",
  "#9ab8d8",
  "#6d9ac5",
  "#4e79a7",
  "#3a6291",
  "#264b73",
] as const;

export const CATEGORICAL = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
] as const;

export const NEUTRAL = "#bab0ac" as const;

export const SEQUENTIAL_BLUES: ColorBreak[] = [
  { value: 0, color: "#f0f4f8", label: "0" },
  { value: 5, color: "#c6d7eb", label: "5" },
  { value: 15, color: "#9ab8d8", label: "15" },
  { value: 30, color: "#6d9ac5", label: "30" },
  { value: 50, color: "#4e79a7", label: "50" },
  { value: 100, color: "#3a6291", label: "100" },
  { value: 200, color: "#264b73", label: "200+" },
];

export const DIVERGING = {
  positive: "#4e79a7",
  negative: "#e15759",
  neutral: NEUTRAL,
};

export const WEB: Palette = {
  categorical: CATEGORICAL,
  sequential: BLUE_RAMP,
  breaks: SEQUENTIAL_BLUES,
  diverging: DIVERGING,
  ink: {
    text: "#1b1a17",
    muted: "#6d6a63",
    grid: "#e4e0d8",
    surface: "#ffffff",
    background: "#ffffff",
    reference: "#e15759",
  },
};

/* -------------------------------------------------------------- gruvbox */

/**
 * The report site's palette (morhetz/gruvbox). Ordered so adjacent series stay
 * distinguishable: the bright accents first, then the dimmer ones.
 */
export const GRUVBOX_CATEGORICAL = [
  "#fabd2f", // yellow
  "#83a598", // blue
  "#fe8019", // orange
  "#8ec07c", // aqua
  "#d3869b", // purple
  "#b8bb26", // green
  "#fb4934", // red
  "#928374", // gray
] as const;

/** Dark to light, so a higher value reads as brighter against a dark page. */
export const GRUVBOX_RAMP = [
  "#32302f",
  "#504945",
  "#665c54",
  "#7c6f64",
  "#a89984",
  "#d5c4a1",
  "#fabd2f",
] as const;

export const GRUVBOX_DARK: Palette = {
  categorical: GRUVBOX_CATEGORICAL,
  sequential: GRUVBOX_RAMP,
  breaks: GRUVBOX_RAMP.map((color, i) => ({ value: i, color, label: String(i) })),
  diverging: { negative: "#fb4934", neutral: "#665c54", positive: "#83a598" },
  ink: {
    text: "#ebdbb2",
    muted: "#a89984",
    grid: "#3c3836",
    surface: "#32302f",
    // Transparent, so a chart sits on whatever the report's background is and the two
    // cannot drift apart when the stylesheet's tokens change.
    background: "transparent",
    reference: "#fb4934",
  },
};

export const GRUVBOX_LIGHT: Palette = {
  categorical: [
    "#b57614",
    "#076678",
    "#af3a03",
    "#427b58",
    "#8f3f71",
    "#79740e",
    "#9d0006",
    "#7c6f64",
  ],
  sequential: ["#fbf1c7", "#ebdbb2", "#d5c4a1", "#bdae93", "#a89984", "#928374", "#b57614"],
  breaks: [],
  diverging: { negative: "#9d0006", neutral: "#bdae93", positive: "#076678" },
  ink: {
    text: "#3c3836",
    muted: "#665c54",
    grid: "#d5c4a1",
    surface: "#f2e5bc",
    background: "transparent",
    reference: "#9d0006",
  },
};
GRUVBOX_LIGHT.breaks = GRUVBOX_LIGHT.sequential.map((color, i) => ({
  value: i,
  color,
  label: String(i),
}));

export const PALETTES: Record<string, Palette> = {
  web: WEB,
  gruvbox: GRUVBOX_DARK,
  "gruvbox-light": GRUVBOX_LIGHT,
};

export function palette(name: string = "web"): Palette {
  const found = PALETTES[name];
  if (!found) {
    // Named a palette that does not exist. Falling back silently would ship a chart in the
    // wrong theme and look like a styling bug rather than a typo.
    throw new Error(
      `unknown palette ${JSON.stringify(name)}; have ${Object.keys(PALETTES).join(", ")}`,
    );
  }
  return found;
}

/** Series colour by index, cycling rather than running out. */
export function seriesColor(p: Palette, i: number): string {
  return p.categorical[i % p.categorical.length];
}
