import { useState, useMemo } from "react";
import { useRuntimeData } from "./use-runtime-data";
import { useLinkedSelection } from "./use-linked-selection";
import StatTiles from "./stat-tiles";
import YearRangeSlider from "./YearRangeSlider";
import FilterToggleGroup from "./FilterToggleGroup";
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

const TABLE_COLUMNS = [
  { key: "name", label: "Tract", sortable: true },
  { key: "units", label: "Approved Units", align: "right" as const, sortable: true },
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

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, t) => sum + t.units, 0),
    [filtered],
  );

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
            label: "RHNA Pace",
            detail: `${d.rhna.total.toLocaleString()} target`,
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
            rows={filtered.filter((t) => t.units > 0)}
            rowKey="tractId"
            defaultSort={{ key: "units", direction: "desc" }}
            selection={selection}
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
