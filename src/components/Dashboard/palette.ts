/**
 * Moved to `src/lib/charts/palettes.ts` on 2026-11-21, so the report site's server-side
 * renderer uses the same values rather than a second copy of them. Kept as a re-export: every
 * existing import keeps working and there is still exactly one definition.
 */
export { BLUE_RAMP, CATEGORICAL, NEUTRAL } from "@/lib/charts/palettes";
