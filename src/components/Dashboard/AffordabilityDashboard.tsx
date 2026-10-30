import { useState, useMemo } from "react";
import { useRuntimeData } from "./use-runtime-data";
import { useLinkedSelection } from "./use-linked-selection";
import StatTiles from "./stat-tiles";
import FilterToggleGroup from "./FilterToggleGroup";
import ChoroplethMap from "./ChoroplethMap";
import MapLegend from "./MapLegend";
import DataTable from "./data-table";
import CsvExport from "./CsvExport";
import { geometricBreaks } from "./color-scales";
import type { TractId, ColorBreak } from "./types";
import * as layout from "./dashboard-layout.module.css";

type TractRow = {
  tractId: TractId;
  name: string;
  medianRent: number | null;
  medianRentPctIncome: number | null;
  medianHomeValue: number | null;
  medianHouseholdIncome: number | null;
  costBurdenedPct: number | null;
};

type MetricDef = {
  key: string;
  label: string;
  format: string;
  colorScale: string;
};

type AffordabilityData = {
  tracts: TractRow[];
  citywide: {
    medianRent: number | null;
    medianHomeValue: number | null;
    costBurdenedPct: number | null;
  };
  metrics: MetricDef[];
  metadata: { source: string; notes: string };
};

type GeoJSONFC = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

const METRIC_OPTIONS = [
  { value: "costBurdenedPct", label: "Cost Burden" },
  { value: "medianRent", label: "Rent" },
  { value: "medianHomeValue", label: "Home Value" },
  { value: "medianHouseholdIncome", label: "Income" },
];

function formatValue(val: number | null | undefined, metric: string): string {
  if (val == null) return "N/A";
  if (metric === "costBurdenedPct" || metric === "medianRentPctIncome") {
    return `${val}%`;
  }
  if (metric === "medianRent" || metric === "medianHomeValue" || metric === "medianHouseholdIncome") {
    return `$${val.toLocaleString()}`;
  }
  return val.toLocaleString();
}

function buildBreaks(tracts: TractRow[], metric: string): ColorBreak[] {
  const values = tracts
    .map((t) => (t as Record<string, unknown>)[metric] as number | null)
    .filter((v): v is number => v != null && v > 0);

  if (!values.length) return [{ value: 0, color: "#eff6ff" }];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (metric === "costBurdenedPct") {
    return [
      { value: 0, color: "#eff6ff", label: "0%" },
      { value: 20, color: "#bfdbfe", label: "20%" },
      { value: 30, color: "#93c5fd", label: "30%" },
      { value: 40, color: "#60a5fa", label: "40%" },
      { value: 50, color: "#3b82f6", label: "50%" },
      { value: 60, color: "#2563eb", label: "60%" },
      { value: 75, color: "#1d4ed8", label: "75%+" },
    ];
  }

  if (metric === "medianRent") {
    return [
      { value: 0, color: "#eff6ff", label: "$0" },
      { value: 1500, color: "#bfdbfe", label: "$1,500" },
      { value: 1800, color: "#93c5fd", label: "$1,800" },
      { value: 2100, color: "#60a5fa", label: "$2,100" },
      { value: 2400, color: "#3b82f6", label: "$2,400" },
      { value: 2800, color: "#2563eb", label: "$2,800" },
      { value: 3500, color: "#1d4ed8", label: "$3,500+" },
    ];
  }

  if (metric === "medianHomeValue") {
    return [
      { value: 0, color: "#eff6ff", label: "$0" },
      { value: 400000, color: "#bfdbfe", label: "$400K" },
      { value: 550000, color: "#93c5fd", label: "$550K" },
      { value: 700000, color: "#60a5fa", label: "$700K" },
      { value: 900000, color: "#3b82f6", label: "$900K" },
      { value: 1200000, color: "#2563eb", label: "$1.2M" },
      { value: 1500000, color: "#1d4ed8", label: "$1.5M+" },
    ];
  }

  if (metric === "medianHouseholdIncome") {
    return [
      { value: 0, color: "#eff6ff", label: "$0" },
      { value: 40000, color: "#bfdbfe", label: "$40K" },
      { value: 60000, color: "#93c5fd", label: "$60K" },
      { value: 80000, color: "#60a5fa", label: "$80K" },
      { value: 100000, color: "#3b82f6", label: "$100K" },
      { value: 130000, color: "#2563eb", label: "$130K" },
      { value: 175000, color: "#1d4ed8", label: "$175K+" },
    ];
  }

  const breaks = geometricBreaks(min || 1, max, 6);
  const palette = ["#eff6ff", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];
  return [{ value: 0, color: palette[0] }, ...breaks.map((b, i) => ({
    value: b,
    color: palette[i + 1] ?? palette[palette.length - 1],
  }))];
}

function mergeGeoJSON(
  geojson: GeoJSONFC,
  tracts: TractRow[],
  metric: string,
): GeoJSONFC {
  const tractMap = new Map<string, number>();
  for (const t of tracts) {
    const val = (t as Record<string, unknown>)[metric] as number | null;
    tractMap.set(t.tractId, val ?? 0);
  }
  return {
    ...geojson,
    features: geojson.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        value: tractMap.get(f.properties?.GEOID ?? f.id as string) ?? 0,
      },
    })),
  };
}

export default function AffordabilityDashboard() {
  const data = useRuntimeData<AffordabilityData>("/data/affordability-map.json");
  const geo = useRuntimeData<GeoJSONFC>("/data/tracts.geojson");
  const selection = useLinkedSelection<TractId>();
  const [metric, setMetric] = useState("costBurdenedPct");

  const breaks = useMemo(
    () => data.data ? buildBreaks(data.data.tracts, metric) : [],
    [data.data, metric],
  );
  const mergedGeo = useMemo(
    () => (geo.data && data.data) ? mergeGeoJSON(geo.data, data.data.tracts, metric) : null,
    [geo.data, data.data, metric],
  );

  if (data.status === "loading" || geo.status === "loading") {
    return <div className={layout.loading}>Loading affordability data...</div>;
  }

  if (data.status === "error" || geo.status === "error") {
    return <div className={layout.error}>{data.error ?? geo.error}</div>;
  }

  const d = data.data!;
  const selectedTract = d.tracts.find((t) => t.tractId === selection.activeUnit);

  const tableRows = d.tracts
    .filter((t) => t.medianRent != null || t.medianHomeValue != null)
    .map((t) => ({
      tractId: t.tractId,
      name: t.name,
      medianRent: t.medianRent ?? 0,
      medianHomeValue: t.medianHomeValue ?? 0,
      medianHouseholdIncome: t.medianHouseholdIncome ?? 0,
      costBurdenedPct: t.costBurdenedPct ?? 0,
    }));

  return (
    <div className={layout.dashboard}>
      <StatTiles
        tiles={[
          {
            value: d.citywide.medianRent != null ? `$${d.citywide.medianRent.toLocaleString()}` : "N/A",
            label: "Median Rent",
          },
          {
            value: d.citywide.medianHomeValue != null ? `$${d.citywide.medianHomeValue.toLocaleString()}` : "N/A",
            label: "Median Home Value",
          },
          {
            value: d.citywide.costBurdenedPct != null ? `${d.citywide.costBurdenedPct}%` : "N/A",
            label: "% Cost-Burdened",
            trend: (d.citywide.costBurdenedPct ?? 0) > 50 ? "negative" : "neutral",
          },
        ]}
      />

      <div className={layout.controls}>
        <FilterToggleGroup
          options={METRIC_OPTIONS}
          value={metric}
          onChange={setMetric}
          label="Metric"
        />
      </div>

      <div className={layout.splitPane}>
        <div>
          {mergedGeo && (
            <ChoroplethMap
              geojson={mergedGeo}
              featureIdField="GEOID"
              colorField="value"
              colorBreaks={breaks}
              selection={selection}
            />
          )}
          <MapLegend
            variant="sequential"
            breaks={breaks}
            title={METRIC_OPTIONS.find((o) => o.value === metric)?.label ?? metric}
          />
        </div>
        <div>
          {selectedTract ? (
            <TractDetail tract={selectedTract} />
          ) : (
            <DataTable
              columns={[
                { key: "name", label: "Tract", sortable: true },
                { key: "costBurdenedPct", label: "Cost Burden %", align: "right", sortable: true },
                { key: "medianRent", label: "Rent", align: "right", sortable: true },
                { key: "medianHomeValue", label: "Home Value", align: "right", sortable: true },
              ]}
              rows={tableRows}
              rowKey="tractId"
              defaultSort={{ key: "costBurdenedPct", direction: "desc" }}
              selection={selection}
            />
          )}
        </div>
      </div>

      <div className={layout.exportRow}>
        <CsvExport
          rows={tableRows}
          columns={[
            { key: "tractId", label: "GEOID" },
            { key: "name", label: "Tract" },
            { key: "medianRent", label: "Median Rent" },
            { key: "medianHomeValue", label: "Median Home Value" },
            { key: "medianHouseholdIncome", label: "Median Household Income" },
            { key: "costBurdenedPct", label: "% Cost-Burdened" },
          ]}
          filename="oceanside-affordability-map"
        />
      </div>
    </div>
  );
}

function TractDetail({ tract }: { tract: TractRow }) {
  const rows = [
    { label: "Median Rent", value: formatValue(tract.medianRent, "medianRent") },
    { label: "Rent % of Income", value: formatValue(tract.medianRentPctIncome, "costBurdenedPct") },
    { label: "Median Home Value", value: formatValue(tract.medianHomeValue, "medianHomeValue") },
    { label: "Median Income", value: formatValue(tract.medianHouseholdIncome, "medianHouseholdIncome") },
    { label: "% Cost-Burdened", value: formatValue(tract.costBurdenedPct, "costBurdenedPct") },
  ];

  return (
    <div style={{ padding: "1rem", background: "var(--dash-surface)", borderRadius: "4px", border: "1px solid var(--rule)" }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem", color: "var(--dark-grey)" }}>
        {tract.name}
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem 1rem", margin: 0 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "contents" }}>
            <dt style={{ fontSize: "0.8rem", color: "var(--light-grey)" }}>{r.label}</dt>
            <dd style={{ fontSize: "0.85rem", fontFamily: "var(--dash-mono)", textAlign: "right", margin: 0, color: "var(--dark-grey)" }}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
