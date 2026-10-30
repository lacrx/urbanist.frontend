import { useState, useMemo } from "react";
import { useRuntimeData } from "./use-runtime-data";
import { useLinkedSelection } from "./use-linked-selection";
import StatTiles from "./stat-tiles";
import type { StatTile } from "./stat-tiles";
import YearRangeSlider from "./YearRangeSlider";
import FilterToggleGroup from "./FilterToggleGroup";
import BarChart from "./bar-chart";
import ChoroplethMap from "./ChoroplethMap";
import MapLegend from "./MapLegend";
import DataTable from "./data-table";
import CsvExport from "./CsvExport";
import { SEQUENTIAL_BLUES } from "./color-scales";
import type { YearRange, TractId, ColorBreak } from "./types";
import * as layout from "./dashboard-layout.module.css";

type TractRow = {
  tractId: TractId;
  name: string;
  deedRestricted: number;
  marketRate: number;
  byTier: Record<string, number>;
  byYear: Record<string, number>;
};

type RhnaPace = {
  target: number;
  achieved: number;
  pct: number;
};

type AffordableData = {
  tracts: TractRow[];
  citywide: {
    deedRestricted: number;
    marketRate: number;
    percentAffordable: number;
    byTier: Record<string, number>;
  };
  yearRange: [number, number];
  yearlyByTier: Array<{ year: number; tier: string; units: number }>;
  rhnaPaceByTier: Record<string, RhnaPace>;
  rhna: Record<string, number>;
  incomeTiers: string[];
};

type GeoJSONFC = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

const TIER_LABELS: Record<string, string> = {
  veryLow: "Very Low",
  low: "Low",
  moderate: "Moderate",
  aboveModerate: "Above Moderate",
};

const TIER_COLORS = ["#1e40af", "#3b82f6", "#60a5fa", "#bfdbfe"];

const VIEW_OPTIONS = [
  { value: "all", label: "All Units" },
  { value: "dr", label: "Deed-Restricted" },
];

const AFFORDABLE_BLUES: ColorBreak[] = [
  { value: 0, color: "#eff6ff", label: "0" },
  { value: 2, color: "#bfdbfe", label: "2" },
  { value: 5, color: "#93c5fd", label: "5" },
  { value: 10, color: "#60a5fa", label: "10" },
  { value: 25, color: "#3b82f6", label: "25" },
  { value: 50, color: "#2563eb", label: "50" },
  { value: 100, color: "#1d4ed8", label: "100+" },
];

function mergeGeoJSON(
  geojson: GeoJSONFC,
  tracts: TractRow[],
  metric: "deedRestricted" | "marketRate" | "total",
): GeoJSONFC {
  const tractMap = new Map<string, number>();
  for (const t of tracts) {
    const val = metric === "total"
      ? t.deedRestricted + t.marketRate
      : t[metric];
    tractMap.set(t.tractId, val);
  }
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

export default function AffordableUnitsDashboard() {
  const data = useRuntimeData<AffordableData>("/data/affordable-units.json");
  const geo = useRuntimeData<GeoJSONFC>("/data/tracts.geojson");
  const selection = useLinkedSelection<TractId>();

  const [yearRange, setYearRange] = useState<YearRange | null>(null);
  const [view, setView] = useState("all");

  if (data.status === "loading" || geo.status === "loading") {
    return <div className={layout.loading}>Loading affordable units data...</div>;
  }

  if (data.status === "error" || geo.status === "error") {
    return <div className={layout.error}>{data.error ?? geo.error}</div>;
  }

  const d = data.data!;
  const activeRange: YearRange = yearRange ?? d.yearRange;

  const filteredChart = d.yearlyByTier.filter(
    (r) => r.year >= activeRange[0] && r.year <= activeRange[1],
  );

  const mapMetric = view === "dr" ? "deedRestricted" as const : "total" as const;
  const mergedGeo = geo.data ? mergeGeoJSON(geo.data, d.tracts, mapMetric) : null;

  const tableRows = d.tracts
    .map((t) => ({
      tractId: t.tractId,
      name: t.name,
      deedRestricted: t.deedRestricted,
      marketRate: t.marketRate,
      total: t.deedRestricted + t.marketRate,
      veryLow: t.byTier.veryLow ?? 0,
      low: t.byTier.low ?? 0,
      moderate: t.byTier.moderate ?? 0,
      aboveModerate: t.byTier.aboveModerate ?? 0,
    }))
    .filter((t) => t.total > 0);

  const rhnaTiles: StatTile[] = [
    {
      value: d.citywide.deedRestricted.toLocaleString(),
      label: "Deed-Restricted",
    },
    {
      value: d.citywide.marketRate.toLocaleString(),
      label: "Market Rate",
    },
    {
      value: `${d.citywide.percentAffordable}%`,
      label: "% Affordable (DR)",
      trend: d.citywide.percentAffordable >= 15 ? "positive" : "negative",
    },
  ];

  const sparkline = Array.from(
    { length: d.yearRange[1] - d.yearRange[0] + 1 },
    (_, i) => {
      const yr = d.yearRange[0] + i;
      return d.yearlyByTier
        .filter((r) => r.year === yr)
        .reduce((sum, r) => sum + r.units, 0);
    },
  );

  return (
    <div className={layout.dashboard}>
      <StatTiles tiles={rhnaTiles} />

      <RhnaPaceSection pace={d.rhnaPaceByTier} />

      <div className={layout.controls}>
        <YearRangeSlider
          min={d.yearRange[0]}
          max={d.yearRange[1]}
          value={activeRange}
          onChange={setYearRange}
          sparklineData={sparkline}
        />
        <FilterToggleGroup
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          label="View"
        />
      </div>

      <BarChart
        rows={filteredChart.map((r) => ({
          year: r.year,
          units: r.units,
          tier: TIER_LABELS[r.tier] ?? r.tier,
        }))}
        config={{
          mode: "stacked",
          xField: "year",
          yField: "units",
          seriesField: "tier",
          xLabel: "Year",
          yLabel: "Units",
          colors: TIER_COLORS,
          domain: Object.values(TIER_LABELS),
          title: "Units by Income Tier",
        }}
        height={320}
      />

      <div className={layout.splitPane}>
        <div>
          {mergedGeo && (
            <ChoroplethMap
              geojson={mergedGeo}
              featureIdField="GEOID"
              colorField="units"
              colorBreaks={view === "dr" ? AFFORDABLE_BLUES : SEQUENTIAL_BLUES}
              selection={selection}
            />
          )}
          <MapLegend
            variant="sequential"
            breaks={view === "dr" ? AFFORDABLE_BLUES : SEQUENTIAL_BLUES}
            title={view === "dr" ? "Deed-restricted units" : "Total units"}
          />
        </div>
        <div>
          <DataTable
            columns={[
              { key: "name", label: "Tract", sortable: true },
              { key: "deedRestricted", label: "DR", align: "right", sortable: true },
              { key: "marketRate", label: "Market", align: "right", sortable: true },
              { key: "total", label: "Total", align: "right", sortable: true },
            ]}
            rows={tableRows}
            rowKey="tractId"
            defaultSort={{ key: "total", direction: "desc" }}
            selection={selection}
          />
        </div>
      </div>

      <div className={layout.exportRow}>
        <CsvExport
          rows={tableRows}
          columns={[
            { key: "tractId", label: "GEOID" },
            { key: "name", label: "Tract" },
            { key: "deedRestricted", label: "Deed-Restricted" },
            { key: "marketRate", label: "Market Rate" },
            { key: "total", label: "Total" },
            { key: "veryLow", label: "Very Low Income" },
            { key: "low", label: "Low Income" },
            { key: "moderate", label: "Moderate Income" },
            { key: "aboveModerate", label: "Above Moderate" },
          ]}
          filename={`oceanside-affordable-units-${activeRange[0]}-${activeRange[1]}`}
        />
      </div>
    </div>
  );
}

function RhnaPaceSection({ pace }: { pace: Record<string, RhnaPace> }) {
  const tiers = ["veryLow", "low", "moderate", "aboveModerate"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--dark-grey)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        RHNA Progress (6th Cycle)
      </div>
      {tiers.map((tier) => {
        const p = pace[tier];
        if (!p) return null;
        const pct = Math.min(p.pct, 100);
        const color = p.pct >= 80 ? "var(--dash-positive)" : p.pct >= 40 ? "var(--dash-accent)" : "var(--dash-negative)";
        return (
          <div key={tier} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: "7rem", fontSize: "0.8rem", color: "var(--dark-grey)" }}>
              {TIER_LABELS[tier]}
            </span>
            <div style={{ flex: 1, height: "0.75rem", background: "var(--dash-surface)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.3s" }} />
            </div>
            <span style={{ width: "5rem", fontSize: "0.75rem", fontFamily: "var(--dash-mono)", textAlign: "right", color: "var(--dark-grey)" }}>
              {p.achieved.toLocaleString()} / {p.target.toLocaleString()}
            </span>
            <span style={{ width: "3rem", fontSize: "0.75rem", fontFamily: "var(--dash-mono)", textAlign: "right", color }}>
              {p.pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
