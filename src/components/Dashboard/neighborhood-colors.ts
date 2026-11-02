import { CATEGORICAL, NEUTRAL } from "./palette";

export type NeighborhoodColorMap = Map<string, string>;

const COLORED_SLOTS = CATEGORICAL.length;

export function buildNeighborhoodColorMap(
  rankedIds: string[],
): NeighborhoodColorMap {
  const map = new Map<string, string>();
  for (let i = 0; i < rankedIds.length; i++) {
    map.set(rankedIds[i], i < COLORED_SLOTS ? CATEGORICAL[i] : NEUTRAL);
  }
  return map;
}

export function neighborhoodColor(
  colorMap: NeighborhoodColorMap,
  id: string,
): string {
  return colorMap.get(id) ?? NEUTRAL;
}

export function isColoredNeighborhood(
  colorMap: NeighborhoodColorMap,
  id: string,
): boolean {
  const c = colorMap.get(id);
  return c != null && c !== NEUTRAL;
}
