/**
 * Moved to `src/lib/charts/` on 2026-11-21: the scale functions to `scales.ts` and the
 * palettes to `palettes.ts`, so the report site's server-side renderer shares them. Kept as a
 * re-export so no component import changed.
 */
export {
  sequentialScale,
  geometricBreaks,
  divergingScale,
  buildMapLibreStepExpression,
} from "@/lib/charts/scales";
export { SEQUENTIAL_BLUES, DIVERGING } from "@/lib/charts/palettes";
