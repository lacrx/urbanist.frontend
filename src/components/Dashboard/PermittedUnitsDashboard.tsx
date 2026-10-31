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
import type { YearRange, TractId, ColorBreak } from "./types";
import * as layout from "./dashboard-layout.module.css";

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span
      style={{ position: "relative", cursor: "help", borderBottom: "1px dotted var(--dash-neutral)" }}
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
  { key: "name", label: "Tract", sortable: true },
  { key: "units", label: "Approved Units", align: "right" as const, sortable: true },
  {
    key: "rankChange",
    label: "YoY",
    align: "center" as const,
    sortable: true,
    render: (v: unknown) => rankDelta(v as number),
  },
];

function filterTracts(
  tracts: TractRow[],
  yearRange: YearRange,
  category: string,
): Array<{ tractId: string; name: string; units: number }> {
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
    return { tractId: t.tractId, name: t.name, units };
  });
}

function mergeGeoJSON(
  geojson: GeoJSONFC,
  filteredTracts: Array<{ tractId: string; units: number }>,
): GeoJSONFC {
  const tractMap = new Map(filteredTracts.map((t) => [t.tractId, t.units]));
  return {
    ...geojson,
    features: geojson.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        units: tractMap.get(f.properties?.GEOID ?? f.id as string) ?? 0,
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

  const activeRange: YearRange = yearRange ?? (data.data?.yearRange ?? [2018, 2025]);

  const filtered = useMemo(() => {
    if (!data.data) return [];
    return filterTracts(data.data.tracts, activeRange, category);
  }, [data.data, activeRange, category]);

  const mergedGeo = useMemo(() => {
    if (!geo.data || !filtered.length) return null;
    return mergeGeoJSON(geo.data, filtered);
  }, [geo.data, filtered]);

  const yoyYears = useMemo((): [number, number] | null => {
    if (!data.data) return null;
    for (let y = activeRange[1]; y > activeRange[0]; y--) {
      const yr = String(y);
      const hasData = data.data.tracts.some((t) =>
        category === "all" ? (t.byYear[yr] ?? 0) > 0 : (t.byYearCategory?.[yr]?.[category] ?? 0) > 0,
      );
      if (hasData) return [y - 1, y];
    }
    return null;
  }, [data.data, activeRange, category]);

  const latestYearFiltered = useMemo(() => {
    if (!data.data || !yoyYears) return [];
    return filterTracts(data.data.tracts, [yoyYears[1], yoyYears[1]], category);
  }, [data.data, yoyYears, category]);

  const priorFiltered = useMemo(() => {
    if (!data.data || !yoyYears) return [];
    if (yoyYears[0] < data.data.yearRange[0]) return [];
    return filterTracts(data.data.tracts, [yoyYears[0], yoyYears[0]], category);
  }, [data.data, yoyYears, category]);

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
    if (!data.data) return [];
    const points: TrendPoint[] = [];
    const [lo, hi] = activeRange;
    for (const t of data.data.tracts) {
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
  }, [data.data, activeRange, category]);

  const activeTractName = useMemo(() => {
    if (!selection.activeUnit || !data.data) return null;
    return data.data.tracts.find((t) => t.tractId === selection.activeUnit)?.name ?? null;
  }, [selection.activeUnit, data.data]);

  const scatterData = useMemo((): { points: ScatterPoint[]; avgX: number } => {
    if (!data.data || !yoyYears) return { points: [], avgX: 0 };
    const years = activeRange[1] - activeRange[0] + 1;
    const points: ScatterPoint[] = [];

    for (const t of data.data.tracts) {
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
  }, [data.data, activeRange, category, yoyYears]);

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
            : `All tracts · ${category !== "all" ? category + " · " : ""}${activeRange[0]}–${activeRange[1]}`
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

      <div>
        <h3 style={{
          fontFamily: "var(--sans)",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--dash-accent)",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          margin: "0 0 0.15rem",
        }}>
          Geographic Distribution
        </h3>
        <p style={{
          fontFamily: "var(--serif)",
          fontSize: "0.88rem",
          color: "var(--light-grey)",
          margin: "0 0 0.75rem",
          lineHeight: 1.3,
        }}>
          {activeTractName
            ? `${activeTractName} · ${activeRange[0]}–${activeRange[1]}`
            : `By census tract · ${activeRange[0]}–${activeRange[1]}`}
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
            searchKeys={["name"]}
          />
        </div>
      </div>

      <div className={layout.exportRow}>
        <CsvExport
          rows={filtered}
          columns={[
            { key: "tractId", label: "GEOID" },
            { key: "name", label: "Tract" },
            { key: "units", label: "Approved Units" },
          ]}
          filename={`oceanside-permitted-units-${activeRange[0]}-${activeRange[1]}${category !== "all" ? `-${category}` : ""}`}
        />
      </div>
    </div>
  );
}
