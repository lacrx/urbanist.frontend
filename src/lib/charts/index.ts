/**
 * The shared chart core: palettes, scales and the Plot spec lexicon.
 *
 * Framework-free on purpose. Two consumers:
 *   - this repository's React dashboard components, which mount a spec into a ref;
 *   - the report site on workhorse, which renders the same spec to SVG in Node.
 *
 * Adding a chart type means adding a builder in `specs.ts`, and both get it.
 */
export * from "./palettes.ts";
export * from "./scales.ts";
export * from "./specs.ts";
