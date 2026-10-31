export type Neighborhood = {
  id: string;
  name: string;
  tracts: string[];
};

export type NeighborhoodMapping = {
  neighborhoods: Neighborhood[];
  exclude: string[];
};

export function fipsToTractNumber(geoid: string): string {
  const tract = geoid.slice(5);
  const base = parseInt(tract.slice(0, 4), 10);
  const suffix = tract.slice(4);
  return suffix === "00" ? String(base) : `${base}.${suffix}`;
}

export function tractLabel(tracts: string[]): string {
  const numbers = tracts.map(fipsToTractNumber);
  return tracts.length === 1
    ? `Tract ${numbers[0]}`
    : `Tracts ${numbers.join(", ")}`;
}

export function buildTractToGroupMap(
  mapping: NeighborhoodMapping,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const n of mapping.neighborhoods) {
    for (const t of n.tracts) {
      map[t] = n.id;
    }
  }
  return map;
}

export function buildGroupToTractsMap(
  mapping: NeighborhoodMapping,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const n of mapping.neighborhoods) {
    map.set(n.id, [...n.tracts]);
  }
  return map;
}

type TractLike = {
  tractId: string;
  name: string;
  totalApproved: number;
  byYear: Record<string, number>;
  byCategory: Record<string, number>;
  byYearCategory: Record<string, Record<string, number>>;
};

export type NeighborhoodRow<T extends TractLike = TractLike> = T & {
  tractIds: string[];
  tractLabel: string;
};

function aggregateTracts<T extends TractLike>(tracts: T[]) {
  const byYear: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byYearCategory: Record<string, Record<string, number>> = {};
  let totalApproved = 0;

  for (const t of tracts) {
    totalApproved += t.totalApproved;
    for (const [yr, val] of Object.entries(t.byYear)) {
      byYear[yr] = (byYear[yr] ?? 0) + val;
    }
    for (const [cat, val] of Object.entries(t.byCategory)) {
      byCategory[cat] = (byCategory[cat] ?? 0) + val;
    }
    for (const [yr, cats] of Object.entries(t.byYearCategory)) {
      byYearCategory[yr] ??= {};
      for (const [cat, val] of Object.entries(cats)) {
        byYearCategory[yr][cat] = (byYearCategory[yr][cat] ?? 0) + val;
      }
    }
  }

  return { totalApproved, byYear, byCategory, byYearCategory };
}

export function groupByNeighborhood<T extends TractLike>(
  tracts: T[],
  mapping: NeighborhoodMapping,
): NeighborhoodRow<T>[] {
  const tractMap = new Map(tracts.map((t) => [t.tractId, t]));
  const excludeSet = new Set(mapping.exclude);
  const mappedSet = new Set(mapping.neighborhoods.flatMap((n) => n.tracts));
  const result: NeighborhoodRow<T>[] = [];

  for (const n of mapping.neighborhoods) {
    const members = n.tracts
      .map((id) => tractMap.get(id))
      .filter((t): t is T => t != null);
    if (members.length === 0) continue;

    const agg = aggregateTracts(members);
    result.push({
      ...members[0],
      ...agg,
      tractId: n.id,
      name: n.name,
      tractIds: n.tracts,
      tractLabel: tractLabel(n.tracts),
    });
  }

  for (const t of tracts) {
    if (mappedSet.has(t.tractId) || excludeSet.has(t.tractId)) continue;
    result.push({
      ...t,
      tractIds: [t.tractId],
      tractLabel: tractLabel([t.tractId]),
    });
  }

  return result;
}

export const OCEANSIDE: NeighborhoodMapping = {
  neighborhoods: [
    { id: "strand-harbor", name: "The Strand / Harbor", tracts: ["06073018301"] },
    { id: "downtown-townsite", name: "Downtown / Townsite", tracts: ["06073018400"] },
    { id: "crown-heights", name: "Crown Heights", tracts: ["06073018202"] },
    { id: "south-oceanside", name: "South Oceanside", tracts: ["06073018201", "06073018302"] },
    { id: "oceana", name: "Oceana", tracts: ["06073018615"] },
    { id: "peacock", name: "Peacock", tracts: ["06073018101", "06073018102"] },
    { id: "fire-mountain", name: "Fire Mountain", tracts: ["06073018509"] },
    { id: "tri-city", name: "Tri-City", tracts: ["06073018504"] },
    { id: "mira-costa", name: "Mira Costa", tracts: ["06073018511"] },
    { id: "loma-alta", name: "Loma Alta", tracts: ["06073018510"] },
    { id: "mission-san-luis-rey", name: "Mission San Luis Rey", tracts: ["06073018616"] },
    { id: "mesa-margarita", name: "Mesa Margarita", tracts: ["06073018601"] },
    { id: "san-luis-rey", name: "San Luis Rey", tracts: ["06073018621", "06073018622", "06073018613"] },
    { id: "rancho-del-oro", name: "Rancho Del Oro", tracts: ["06073018512", "06073018522"] },
    { id: "ivey-ranch", name: "Ivey Ranch", tracts: ["06073018523"] },
    { id: "ocean-hills", name: "Ocean Hills", tracts: ["06073018520", "06073018524", "06073018525"] },
    { id: "north-valley", name: "North Valley", tracts: ["06073018521"] },
    { id: "south-morro-hills", name: "South Morro Hills", tracts: ["06073018608", "06073018609"] },
    { id: "morro-hills", name: "Morro Hills", tracts: ["06073018617", "06073018618", "06073018619", "06073018620", "06073018612"] },
    { id: "escondido-junction", name: "Escondido Junction", tracts: ["06073018515"] },
    { id: "east-oceanside", name: "East Oceanside", tracts: ["06073018516", "06073018517", "06073018518", "06073018519"] },
    { id: "guajome", name: "Guajome", tracts: ["06073019301", "06073019303", "06073019304", "06073019305"] },
    { id: "southeast-oceanside", name: "Southeast Oceanside", tracts: ["06073019805", "06073019808", "06073019809"] },
  ],
  exclude: [
    "06073017801", "06073017901", "06073018000", "06073019803", "06073019810",
    "06073019403", "06073019404", "06073019405", "06073019406", "06073019701", "06073019904",
    "06073018700",
    "06073018803",
    "06073990100",
  ],
};
