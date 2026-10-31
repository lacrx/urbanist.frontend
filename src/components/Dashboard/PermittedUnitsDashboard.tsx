import { useState, useMemo } from "react";
import { useRuntimeData } from "./use-runtime-data";
import { useLinkedSelection } from "./use-linked-selection";
import StatTiles from "./stat-tiles";
import YearRangeSlider from "./YearRangeSlider";
import FilterToggleGroup from "./FilterToggleGroup";
import TrendLineChart from "./TrendLineChart";
import type { TrendPoint } from "./TrendLineChart";
import ScatterPlot from "./ScatterPlot";
import type { ScatterPoint } from "./ScatterPlot";
import ChoroplethMap from "./ChoroplethMap";
import MapLegend from "./MapLegend";
import DataTable from "./data-table";
import CsvExport from "./CsvExport";
import { SEQUENTIAL_BLUES } from "./color-scales";
import type { YearRange, TractId } from "./types";
import {
  OCEANSIDE,
  groupByNeighborhood,
  buildTractToGroupMap,
  buildGroupToTractsMap,
} from "./neighborhood-mapping";
import * as layout from "./dashboard-layout.module.css";
import * as sectionStyles from "./section-heading.module.css";

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span
      style={{ cursor: "help", borderBottom: "1px dotted var(--dash-neutral)" }}
      title={text}
    >
      {children}
    </span>
  );
}

type TractRow = {
  tractId: TractId;
  name: string;
  totalApproved: number;
  byYear: Record<string, number>;
  byCategory: Record<string, number>;
  byYearCategory: Record<string, Record<string, number>>;
};

type PermittedData = {
  tracts: TractRow[];
  citywide: {
    totalApproved: number;
    rhnaPace: number;
    ytd: number;
    byYear: Record<string, number>;
    byCategory: Record<string, number>;
  };
  yearRange: [number, number];
  sparklineByYear: number[];
  categories: string[];
  rhna: Record<string, number>;
};

type GeoJSONFC = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "SFD", label: "SFD" },
  { value: "SFA", label: "SFA" },
  { value: "2-4", label: "2-4" },
  { value: "5+", label: "5+" },
  { value: "ADU", label: "ADU" },
  { value: "MH", label: "MH" },
];

function rankDelta(delta: number): React.ReactNode {
  if (delta > 0)
    return <span style={{ color: "var(--dash-positive)", fontSize: "0.75rem", fontWeight: 600 }}>▲{delta}</span>;
  if (delta < 0)
    return <span style={{ color: "var(--dash-negative)", fontSize: "0.75rem", fontWeight: 600 }}>▼{Math.abs(delta)}</span>;
  return <span style={{ color: "var(--dash-neutral)", fontSize: "0.75rem" }}>—</span>;
}

const TABLE_COLUMNS = [
  {
    key: "name",
    label: "Neighborhood",
    sortable: true,
    render: (v: unknown, row: Record<string, unknown>) => (
      <>
        <span>{v as string}</span>
        {row.tractLabel && (
          <span style={{ display: "block", fontSize: "0.72rem", opacity: 0.55, marginTop: "1px" }}>
            {row.tractLabel as string}
          </span>
        )}
      </>
    ),
  },
  { key: "units", label: "Approved Units", align: "right" as const, sortable: true },
  {
    key: "rankChange",
    label: "YoY",
    align: "center" as const,
    sortable: true,
    render: (v: unknown) => rankDelta(typeof v === "number" ? v : 0),
  },
];

type FilteredRow = {
  tractId: string;
  name: string;
  units: number;
  tractLabel?: string;
};

function filterTracts(
  tracts: Array<TractRow & { tractLabel?: string }>,
  yearRange: YearRange,
  category: string,
): FilteredRow[] {
  return tracts.map((t) => {
    let units = 0;
    for (let y = yearRange[0]; y <= yearRange[1]; y++) {
      const yr = String(y);
      if (category === "all") {
        units += t.byYear[yr] ?? 0;
      } else {
        units += t.byYearCategory?.[yr]?.[category] ?? 0;
      }
    }
    return { tractId: t.tractId, name: t.name, units, tractLabel: t.tractLabel };
  });
}

function mergeGeoJSON(
  geojson: GeoJSONFC,
  filteredData: FilteredRow[],
  groupToTracts: Map<string, string[]>,
  excludeSet: Set<string>,
): GeoJSONFC {
  const unitsMap = new Map<string, number>();
  for (const d of filteredData) {
    const tracts = groupToTracts.get(d.tractId);
    if (tracts) {
      for (const t of tracts) unitsMap.set(t, d.units);
    } else {
      unitsMap.set(d.tractId, d.units);
    }
  }

  return {
    ...geojson,
    features: geojson.features
      .filter((f) => {
        const id = f.properties?.GEOID ?? (f.id as string);
        return !excludeSet.has(id);
      })
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          units: unitsMap.get(f.properties?.GEOID ?? (f.id as string)) ?? 0,
        },
      })),
  };
}

export default function PermittedUnitsDashboard() {
  const data = useRuntimeData<PermittedData>("/data/permitted-units.json");
  const geo = useRuntimeData<GeoJSONFC>("/data/tracts.geojson");
  const selection = useLinkedSelection<TractId>();

  const [yearRange, setYearRange] = useState<YearRange | null>(null);
  const [category, setCategory] = useState("all");

  const mapping = OCEANSIDE;

  const neighborhoods = useMemo(() => {
    if (!data.data) return [];
    return groupByNeighborhood(data.data.tracts, mapping);
  }, [data.data, mapping]);

  const tractToGroup = useMemo(() => buildTractToGroupMap(mapping), [mapping]);
  const groupToTracts = useMemo(() => buildGroupToTractsMap(mapping), [mapping]);
  const excludeSet = useMemo(() => new Set(mapping.exclude), [mapping]);

  const activeRange: YearRange = yearRange ?? (data.data?.yearRange ?? [2018, 2025]);

  const filtered = useMemo(() => {
    if (!neighborhoods.length) return [];
    return filterTracts(neighborhoods, activeRange, category);
  }, [neighborhoods, activeRange, category]);

  const mergedGeo = useMemo(() => {
    if (!geo.data || !filtered.length) return null;
    return mergeGeoJSON(geo.data, filtered, groupToTracts, excludeSet);
  }, [geo.data, filtered, groupToTracts, excludeSet]);

  const yoyYears = useMemo((): [number, number] | null => {
    if (!neighborhoods.length) return null;
    for (let y = activeRange[1]; y > activeRange[0]; y--) {
      const yr = String(y);
      const hasData = neighborhoods.some((t) =>
        category === "all" ? (t.byYear[yr] ?? 0) > 0 : (t.byYearCategory?.[yr]?.[category] ?? 0) > 0,
      );
      if (hasData) return [y - 1, y];
    }
    return null;
  }, [neighborhoods, activeRange, category]);

  const latestYearFiltered = useMemo(() => {
    if (!neighborhoods.length || !yoyYears) return [];
    return filterTracts(neighborhoods, [yoyYears[1], yoyYears[1]], category);
  }, [neighborhoods, yoyYears, category]);

  const priorFiltered = useMemo(() => {
    if (!neighborhoods.length || !yoyYears || !data.data) return [];
    if (yoyYears[0] < data.data.yearRange[0]) return [];
    return filterTracts(neighborhoods, [yoyYears[0], yoyYears[0]], category);
  }, [neighborhoods, yoyYears, data.data, category]);

  const filteredWithRank = useMemo(() => {
    const currentRanked = [...latestYearFiltered].sort((a, b) => b.units - a.units);
    const currentRankMap = new Map(currentRanked.map((t, i) => [t.tractId, i + 1]));

    if (!priorFiltered.length) {
      return filtered.map((t) => ({ ...t, rankChange: 0 }));
    }

    const priorRanked = [...priorFiltered].sort((a, b) => b.units - a.units);
    const priorRankMap = new Map(priorRanked.map((t, i) => [t.tractId, i + 1]));

    return filtered.map((t) => {
      const cur = currentRankMap.get(t.tractId) ?? latestYearFiltered.length;
      const prev = priorRankMap.get(t.tractId) ?? priorFiltered.length;
      return { ...t, rankChange: prev - cur };
    });
  }, [filtered, latestYearFiltered, priorFiltered]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, t) => sum + t.units, 0),
    [filtered],
  );

  const trendData = useMemo((): TrendPoint[] => {
    if (!neighborhoods.length) return [];
    const points: TrendPoint[] = [];
    const [lo, hi] = activeRange;
    for (const t of neighborhoods) {
      for (let y = lo; y <= hi; y++) {
        const yr = String(y);
        const value =
          category === "all"
            ? (t.byYear[yr] ?? 0)
            : (t.byYearCategory?.[yr]?.[category] ?? 0);
        points.push({ year: y, value, tractId: t.tractId, name: t.name });
      }
    }
    return points;
  }, [neighborhoods, activeRange, category]);

  const activeTractName = useMemo(() => {
    if (!selection.activeUnit || !neighborhoods.length) return null;
    return neighborhoods.find((t) => t.tractId === selection.activeUnit)?.name ?? null;
  }, [selection.activeUnit, neighborhoods]);

  const scatterData = useMemo((): { points: ScatterPoint[]; avgX: number } => {
    if (!neighborhoods.length || !yoyYears) return { points: [], avgX: 0 };
    const years = activeRange[1] - activeRange[0] + 1;
    const points: ScatterPoint[] = [];

    for (const t of neighborhoods) {
      let total = 0;
      for (let y = activeRange[0]; y <= activeRange[1]; y++) {
        const yr = String(y);
        total += category === "all" ? (t.byYear[yr] ?? 0) : (t.byYearCategory?.[yr]?.[category] ?? 0);
      }
      if (total === 0) continue;

      const annualized = total / years;
      const curYr = String(yoyYears[1]);
      const prevYr = String(yoyYears[0]);
      const curVal = category === "all" ? (t.byYear[curYr] ?? 0) : (t.byYearCategory?.[curYr]?.[category] ?? 0);
      const prevVal = category === "all" ? (t.byYear[prevYr] ?? 0) : (t.byYearCategory?.[prevYr]?.[category] ?? 0);

      points.push({
        tractId: t.tractId,
        name: t.name,
        x: Math.round(annualized * 10) / 10,
        y: curVal - prevVal,
      });
    }

    const avgX = points.length ? points.reduce((s, p) => s + p.x, 0) / points.length : 0;
    return { points, avgX: Math.round(avgX * 10) / 10 };
  }, [neighborhoods, activeRange, category, yoyYears]);

  if (data.status === "loading" || geo.status === "loading") {
    return <div className={layout.loading}>Loading permitted units data...</div>;
  }

  if (data.status === "error" || geo.status === "error") {
    return <div className={layout.error}>{data.error ?? geo.error}</div>;
  }

  const d = data.data!;

  return (
    <div className={layout.dashboard}>
      <StatTiles
        tiles={[
          {
            value: filteredTotal.toLocaleString(),
            label: "Approved Units",
            detail: category !== "all" ? category : undefined,
          },
          {
            value: `${d.citywide.rhnaPace}%`,
            label: <Tooltip text="Regional Housing Needs Allocation: state-mandated housing production targets for each jurisdiction">RHNA Pace</Tooltip>,
            detail: `${d.rhna.total.toLocaleString()} unit target (6th cycle)`,
            trend: d.citywide.rhnaPace >= 50 ? "positive" : "negative",
          },
          {
            value: d.citywide.ytd.toLocaleString(),
            label: `${d.yearRange[1]} YTD`,
          },
        ]}
      />

      <div className={layout.controls}>
        <YearRangeSlider
          min={d.yearRange[0]}
          max={d.yearRange[1]}
          value={activeRange}
          onChange={setYearRange}
          sparklineData={d.sparklineByYear}
        />
        <FilterToggleGroup
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
          label="Unit type"
        />
      </div>

      <TrendLineChart
        data={trendData}
        selection={selection}
        heading="Permitting Trends"
        subheading={
          activeTractName
            ? `${activeTractName} · ${category !== "all" ? category + " · " : ""}${activeRange[0]}–${activeRange[1]}`
            : `All neighborhoods · ${category !== "all" ? category + " · " : ""}${activeRange[0]}–${activeRange[1]}`
        }
      />

      {scatterData.points.length > 0 && yoyYears && (
        <ScatterPlot
          data={scatterData.points}
          selection={selection}
          heading="Pace vs. Momentum"
          subheading={`Avg annual units vs. change ${yoyYears[0]}–${yoyYears[1]}${category !== "all" ? " · " + category : ""}`}
          xLabel="Avg. annual units"
          yLabel={`Change (${yoyYears[0]}→${yoyYears[1]})`}
          xRef={scatterData.avgX}
          yRef={0}
        />
      )}

      <div className={sectionStyles.section}>
        <h3 className={sectionStyles.title}>Geographic Distribution</h3>
        <p className={sectionStyles.subtitle}>
          {activeTractName
            ? `${activeTractName} · ${activeRange[0]}–${activeRange[1]}`
            : `By neighborhood · ${activeRange[0]}–${activeRange[1]}`}
        </p>
      </div>

      <div className={layout.splitPane}>
        <div>
          {mergedGeo && (
            <ChoroplethMap
              geojson={mergedGeo}
              featureIdField="GEOID"
              colorField="units"
              colorBreaks={SEQUENTIAL_BLUES}
              selection={selection}
              featureGroupMap={tractToGroup}
            />
          )}
          <MapLegend
            variant="sequential"
            breaks={SEQUENTIAL_BLUES}
            title="Approved units"
          />
        </div>
        <div>
          <DataTable
            columns={TABLE_COLUMNS}
            rows={filteredWithRank.filter((t) => t.units > 0)}
            rowKey="tractId"
            defaultSort={{ key: "units", direction: "desc" }}
            selection={selection}
            searchable
            searchKeys={["name", "tractLabel"]}
          />
        </div>
      </div>

      <div className={layout.exportRow}>
        <CsvExport
          rows={filtered}
          columns={[
            { key: "tractId", label: "Neighborhood ID" },
            { key: "name", label: "Neighborhood" },
            { key: "units", label: "Approved Units" },
          ]}
          filename={`oceanside-permitted-units-${activeRange[0]}-${activeRange[1]}${category !== "all" ? `-${category}` : ""}`}
        />
      </div>
    </div>
  );
}
