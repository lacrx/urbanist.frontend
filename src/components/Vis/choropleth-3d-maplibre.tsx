import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer } from "@deck.gl/layers";
import { scaleThreshold } from "d3-scale";
import type { Feature } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapRoot, ready as readyCls, attribution } from "./choropleth-3d-maplibre.module.css";

type Artifact = {
  vizId: string;
  basemap: string | null;
  featuresFile: { publicURL: string | null } | null;
  featuresTilesFile: { publicURL: string | null } | null;
  featuresTilesUrl: string | null;
  tilesLayer: string | null;
  camera: { center: number[]; zoom: number | null; pitch: number | null; bearing: number | null } | null;
  color: { field: string; domain: number[]; range: string[] } | null;
  elevation: { field: string; divisor: number | null } | null;
  fallback2d: { maxViewportWidth: number | null } | null;
};

type Props = { artifact: Artifact };

const BASEMAP_PMTILES_URL =
  process.env.GATSBY_BASEMAP_PMTILES_URL || "/tiles/basemap.pmtiles";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function buildStepColorExpression(field: string, domain: number[], range: string[]): unknown {
  const expr: unknown[] = ["step", ["get", field], range[0]];
  for (let i = 1; i < range.length && i - 1 < domain.length; i++) {
    expr.push(domain[i - 1], range[i]);
  }
  return expr;
}

let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolRegistered = true;
}

const ICON_SVG = {
  rotateCcw: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  rotateCw: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
  chevronUp: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
};

function createCameraControl(step = 20): maplibregl.IControl {
  let container: HTMLDivElement | null = null;
  return {
    onAdd(map: maplibregl.Map) {
      container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group viz-camera-ctrl-h";

      const addButton = (label: string, iconSvg: string, onClick: () => void) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = label;
        btn.setAttribute("aria-label", label);
        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.innerHTML = iconSvg;
        btn.addEventListener("click", onClick);
        container!.appendChild(btn);
      };

      addButton("Rotate counter-clockwise", ICON_SVG.rotateCcw, () =>
        map.easeTo({ bearing: map.getBearing() - step })
      );
      addButton("Rotate clockwise", ICON_SVG.rotateCw, () =>
        map.easeTo({ bearing: map.getBearing() + step })
      );
      addButton("Less tilt (top-down view)", ICON_SVG.chevronUp, () =>
        map.easeTo({ pitch: Math.max(0, map.getPitch() - step) })
      );
      addButton("More tilt (side view)", ICON_SVG.chevronDown, () =>
        map.easeTo({ pitch: Math.min(85, map.getPitch() + step) })
      );

      return container;
    },
    onRemove() {
      container?.parentNode?.removeChild(container);
      container = null;
    },
  };
}

function useIsNarrowViewport(breakpoint: number | null | undefined): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!breakpoint) return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return narrow;
}

const BASEMAP_LAYERS: maplibregl.LayerSpecification[] = [
  {
    id: "landcover-park",
    type: "fill",
    source: "omt",
    "source-layer": "park",
    paint: { "fill-color": "#1a2a1a", "fill-opacity": 0.6 },
  },
  {
    id: "water",
    type: "fill",
    source: "omt",
    "source-layer": "water",
    paint: { "fill-color": "#0d1b2a" },
  },
  {
    id: "road-minor",
    type: "line",
    source: "omt",
    "source-layer": "transportation",
    filter: ["!", ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]]],
    minzoom: 12,
    paint: {
      "line-color": "#252538",
      "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 2],
    },
  },
  {
    id: "road-major",
    type: "line",
    source: "omt",
    "source-layer": "transportation",
    filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
    paint: {
      "line-color": "#2a2a40",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 2.5, 16, 4],
    },
  },
  {
    id: "building",
    type: "fill",
    source: "omt",
    "source-layer": "building",
    minzoom: 14,
    paint: { "fill-color": "#1e1e30", "fill-opacity": 0.6 },
  },
];

export default function Choropleth3DMaplibre({ artifact }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [ready, setReady] = useState(false);

  const fallbackBp = artifact.fallback2d?.maxViewportWidth ?? 360;
  const isNarrow = useIsNarrowViewport(artifact.fallback2d ? fallbackBp : null);
  const usePosterOnly = Boolean(artifact.fallback2d && isNarrow);

  const effectivePitch = artifact.camera?.pitch ?? 45;

  useEffect(() => {
    if (!containerRef.current) return;
    if (usePosterOnly) return;
    if (!artifact.camera || !artifact.color || !artifact.elevation) return;
    const hasTiles = Boolean(artifact.featuresTilesFile?.publicURL || artifact.featuresTilesUrl);
    const hasGeojson = Boolean(artifact.featuresFile?.publicURL);
    if (!hasTiles && !hasGeojson) return;

    ensurePmtilesProtocol();

    const { camera, color, elevation } = artifact;
    const [lng, lat] = camera.center;

    const viewportWidth = window.innerWidth;
    const zoomOffset =
      viewportWidth < 480 ? -2.5 :
      viewportWidth < 768 ? -1.5 :
      viewportWidth < 1024 ? -0.5 :
      0;
    const maxPitchForWidth =
      viewportWidth < 480 ? 35 :
      viewportWidth < 768 ? 45 :
      85;
    const elevationScale =
      viewportWidth < 480 ? 0.4 :
      viewportWidth < 768 ? 0.65 :
      1;
    const initialZoom = (camera.zoom ?? 11) + zoomOffset;

    const resolvedBasemap = artifact.basemap
      || (artifact.featuresTilesUrl
        ? artifact.featuresTilesUrl.replace(/-parcels\.pmtiles$/, ".pmtiles")
        : null)
      || BASEMAP_PMTILES_URL;
    const absoluteBasemapUrl =
      typeof window !== "undefined" && resolvedBasemap.startsWith("/")
        ? `${window.location.origin}${resolvedBasemap}`
        : resolvedBasemap;

    // Start with empty sources so a missing/broken basemap PMTiles file
    // cannot block the load event. The basemap is added best-effort
    // after load fires; the choropleth renders on the dark background
    // regardless.
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        light: {
          anchor: "viewport",
          color: "#ffeedd",
          intensity: 0.45,
          position: [1.5, 210, 30],
        },
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#141422" },
          },
        ],
      },
      center: [lng, lat],
      zoom: initialZoom,
      pitch: Math.min(effectivePitch, maxPitchForWidth),
      bearing: camera.bearing ?? 0,
      maxPitch: 85,
      minZoom: 10,
      maxZoom: 18,
      canvasContextAttributes: { antialias: true },
      attributionControl: false,
      cooperativeGestures: true,
      scrollZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoomRotate: false,
    });
    mapRef.current = map;
    map.addControl(createCameraControl(), "top-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("error", (e) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[viz:${artifact.vizId}] map error`, e.error?.message ?? e);
      }
    });

    if (process.env.NODE_ENV === "development") {
      map.on("moveend", () => {
        const c = map.getCenter();
        const cam = {
          center: [Number(c.lng.toFixed(5)), Number(c.lat.toFixed(5))],
          zoom: Number(map.getZoom().toFixed(2)),
          pitch: Number(map.getPitch().toFixed(1)),
          bearing: Number(map.getBearing().toFixed(1)),
        };
        console.log(`[viz:${artifact.vizId}] camera`, JSON.stringify(cam));
      });
    }

    const markReady = () => {
      if (mapRef.current) {
        mapRef.current.touchZoomRotate.enable();
      }
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setReady(true))
      );
    };

    const safetyTimer = window.setTimeout(markReady, 30000);
    const clearSafety = () => window.clearTimeout(safetyTimer);

    const abortController = new AbortController();
    let idleHandle: number | undefined;

    map.on("load", () => {
      // Best-effort basemap: if the PMTiles file is missing (404) or
      // unreachable, the choropleth still renders on the dark background.
      try {
        map.addSource("omt", {
          type: "vector",
          url: `pmtiles://${absoluteBasemapUrl}`,
          attribution:
            '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        });
        for (const layer of BASEMAP_LAYERS) {
          map.addLayer(layer);
        }
      } catch {
        // Basemap unavailable; continue without it
      }

      // Feature data (critical path)
      if (hasTiles) {
        const rawUrl = artifact.featuresTilesFile?.publicURL ?? artifact.featuresTilesUrl!;
        const tilesUrl =
          typeof window !== "undefined" && rawUrl.startsWith("/")
            ? `${window.location.origin}${rawUrl}`
            : rawUrl;
        const sourceLayer = artifact.tilesLayer ?? "features";
        map.addSource("viz-features", {
          type: "vector",
          url: `pmtiles://${tilesUrl}`,
        });
        map.addLayer({
          id: "viz-features-extrusion",
          type: "fill-extrusion",
          source: "viz-features",
          "source-layer": sourceLayer,
          paint: {
            "fill-extrusion-color": buildStepColorExpression(color.field, color.domain, color.range) as any,
            "fill-extrusion-height": ["*", ["/", ["get", elevation.field], elevation.divisor ?? 1], elevationScale] as any,
            "fill-extrusion-opacity": 1,
          },
        });

        const onSourceData = (e: maplibregl.MapSourceDataEvent) => {
          if (e.sourceId === "viz-features" && e.isSourceLoaded) {
            map.off("sourcedata", onSourceData);
            clearSafety();
            markReady();
          }
        };
        map.on("sourcedata", onSourceData);
      } else {
        const colorScale = scaleThreshold<number, [number, number, number]>()
          .domain(color.domain)
          .range(color.range.map(hexToRgb));
        const divisor = elevation.divisor ?? 1;

        const buildOverlay = () => {
          const overlay = new MapboxOverlay({
          interleaved: true,
          layers: [
            new GeoJsonLayer({
              id: artifact.vizId,
              data: artifact.featuresFile!.publicURL!,
              stroked: false,
              filled: true,
              extruded: true,
              opacity: 0.75,
              pickable: true,
              getFillColor: (f: Feature) =>
                [...colorScale(f.properties?.[color.field] ?? 0), 220] as [number, number, number, number],
              getElevation: (f: Feature) =>
                ((f.properties?.[elevation.field] ?? 0) / divisor) * elevationScale,
              loadOptions: {
                fetch: { signal: abortController.signal },
                worker: true,
              },
              onDataLoad: () => {
                clearSafety();
                markReady();
              },
            }),
          ],
          });
          overlayRef.current = overlay;
          if (mapRef.current) {
            mapRef.current.addControl(overlay as unknown as maplibregl.IControl);
          }
        };

        if (typeof requestIdleCallback === "function") {
          idleHandle = requestIdleCallback(buildOverlay, { timeout: 2000 });
        } else {
          idleHandle = window.setTimeout(buildOverlay, 300);
        }
      }
    });

    return () => {
      abortController.abort();
      if (idleHandle !== undefined) {
        if (typeof cancelIdleCallback === "function") {
          cancelIdleCallback(idleHandle);
        } else {
          window.clearTimeout(idleHandle);
        }
      }
      clearSafety();
      overlayRef.current = null;
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [artifact, effectivePitch, usePosterOnly]);

  return (
    <div
      ref={containerRef}
      className={`${mapRoot}${ready ? ` ${readyCls}` : ""}`}
      aria-label={artifact.vizId}
      data-viz-ready={ready ? "true" : undefined}
    >
      <small className={attribution}>
        <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">
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
