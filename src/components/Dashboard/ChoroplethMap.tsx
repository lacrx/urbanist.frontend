import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import * as styles from "./choropleth-map.module.css";
import type { LinkedSelection, ColorBreak } from "./types";
import { buildMapLibreStepExpression } from "./color-scales";

type GeoJSONData = GeoJSON.FeatureCollection | GeoJSON.Feature | string;

type Props = {
  geojson: GeoJSONData;
  featureIdField: string;
  colorField: string;
  colorBreaks: ColorBreak[];
  selection?: LinkedSelection;
  center?: [number, number];
  zoom?: number;
  basemapUrl?: string;
};

let pmtilesRegistered = false;
function ensurePmtiles() {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

function resolveBasemap(url: string | undefined): string {
  if (process.env.GATSBY_BASEMAP_PMTILES_URL)
    return process.env.GATSBY_BASEMAP_PMTILES_URL;
  return url ?? "/tiles/oceanside.pmtiles";
}

export default function ChoroplethMap({
  geojson,
  featureIdField,
  colorField,
  colorBreaks,
  selection,
  center = [-117.3795, 33.197],
  zoom = 11.5,
  basemapUrl,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const hoveredRef = useRef<string | number | null>(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const onMapHover = useCallback((id: string | number | null) => {
    selectionRef.current?.onHover(id != null ? String(id) : null);
  }, []);

  const onMapSelect = useCallback((id: string | number | null) => {
    if (id != null) selectionRef.current?.onSelect(String(id));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    ensurePmtiles();

    const basemap = resolveBasemap(basemapUrl);
    const absoluteBasemap =
      typeof window !== "undefined" && basemap.startsWith("/")
        ? `${window.location.origin}${basemap}`
        : basemap;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          omt: {
            type: "vector",
            url: `pmtiles://${absoluteBasemap}`,
            attribution:
              '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#ffffff" },
          },
          {
            id: "water",
            type: "fill",
            source: "omt",
            "source-layer": "water",
            paint: { "fill-color": "#d3e2ec" },
          },
          {
            id: "road-major",
            type: "line",
            source: "omt",
            "source-layer": "transportation",
            filter: [
              "in",
              ["get", "class"],
              ["literal", ["motorway", "trunk", "primary", "secondary"]],
            ],
            paint: {
              "line-color": "#d6d6d6",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                0.8,
                14,
                2.5,
              ],
            },
          },
        ],
      },
      center,
      zoom,
      maxPitch: 0,
      attributionControl: false,
      cooperativeGestures: true,
      scrollZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
    });

    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("tracts", {
        type: "geojson",
        data: geojson,
        promoteId: featureIdField,
      });

      const colorExpr = buildMapLibreStepExpression(
        colorField,
        colorBreaks,
      ) as maplibregl.ExpressionSpecification;

      map.addLayer({
        id: "tracts-fill",
        type: "fill",
        source: "tracts",
        paint: {
          "fill-color": colorExpr,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.9,
            0.7,
          ],
        },
      });

      map.addLayer({
        id: "tracts-line",
        type: "line",
        source: "tracts",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "active"], false],
            "#1e40af",
            "#94a3b8",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "active"], false],
            2.5,
            0.8,
          ],
        },
      });

      map.on("mousemove", "tracts-fill", (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].id;
        if (hoveredRef.current !== null && hoveredRef.current !== id) {
          map.setFeatureState(
            { source: "tracts", id: hoveredRef.current },
            { hover: false },
          );
        }
        hoveredRef.current = id ?? null;
        if (id != null) {
          map.setFeatureState({ source: "tracts", id }, { hover: true });
          onMapHover(id);
        }
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "tracts-fill", () => {
        if (hoveredRef.current !== null) {
          map.setFeatureState(
            { source: "tracts", id: hoveredRef.current },
            { hover: false },
          );
        }
        hoveredRef.current = null;
        onMapHover(null);
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "tracts-fill", (e) => {
        if (!e.features?.length) return;
        onMapSelect(e.features[0].id ?? null);
      });

      map.once("idle", () => setReady(true));
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [basemapUrl, center, zoom, featureIdField]);

  // Update source data when geojson changes (without recreating the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("tracts") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(geojson as GeoJSON.GeoJSON);
  }, [geojson]);

  // Update color expression when colorField or colorBreaks change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer("tracts-fill")) return;

    const colorExpr = buildMapLibreStepExpression(
      colorField,
      colorBreaks,
    ) as maplibregl.ExpressionSpecification;
    map.setPaintProperty("tracts-fill", "fill-color", colorExpr);
  }, [colorField, colorBreaks]);

  // Sync active selection state to map features
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("tracts") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = map.querySourceFeatures("tracts");
    for (const f of features) {
      if (f.id == null) continue;
      const isActive = String(f.id) === selection?.activeUnit;
      map.setFeatureState(
        { source: "tracts", id: f.id },
        { active: isActive },
      );
    }
  }, [selection?.activeUnit]);

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={`${styles.map}${ready ? ` ${styles.ready}` : ""}`}
      />
      <small className={styles.attribution}>
        <a
          href="https://openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenMapTiles
        </a>
        {" / "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>
      </small>
    </div>
  );
}
