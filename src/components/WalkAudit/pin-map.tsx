import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as s from "./walk-audit.module.css";

type RouteSegment = { name: string; lines: number[][][] };

type PinMapProps = {
  lat: number | null;
  lng: number | null;
  routeSegments: RouteSegment[] | null;
  onPin: (lat: number, lng: number, label: string | null) => void;
};

export type PinMapHandle = {
  setPin: (lat: number, lng: number) => void;
  clearPin: () => void;
};

const ROUTE_COLOR = "#e8613a";

const OCEANSIDE: [number, number] = [33.1959, -117.3795];
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = reject;
    document.head.appendChild(el);
  });
}

function loadCSS(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address;
    if (a?.road) {
      return a.house_number ? `${a.house_number} ${a.road}` : a.road;
    }
    return data.display_name?.split(",").slice(0, 2).join(",").trim() || null;
  } catch {
    return null;
  }
}

export async function forwardGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&viewbox=-117.45,33.25,-117.30,33.15&bounded=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) {
      const unbounded = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Oceanside, CA")}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!unbounded.ok) return null;
      const data2 = await unbounded.json();
      if (!data2.length) return null;
      return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
    }
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

const PinMap = forwardRef<PinMapHandle, PinMapProps>(function PinMap(
  { lat, lng, routeSegments, onPin },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<React.ReactNode | null>(null);
  const [geoPermission, setGeoPermission] = useState<"checking" | "prompt" | "granted" | "denied">("checking");

  useImperativeHandle(ref, () => ({
    setPin(newLat: number, newLng: number) {
      const L = (window as any).L;
      const map = mapRef.current;
      if (!map || !L) return;
      map.setView([newLat, newLng], 17);
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        markerRef.current = L.marker([newLat, newLng]).addTo(map);
      }
    },
    clearPin() {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      setGpsError(null);
    },
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    loadCSS(LEAFLET_CSS);
    loadScript(LEAFLET_JS).then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!navigator.permissions) {
      setGeoPermission("prompt");
      return;
    }
    let ps: PermissionStatus | null = null;
    navigator.permissions.query({ name: "geolocation" as PermissionName }).then(status => {
      ps = status;
      setGeoPermission(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt");
      status.addEventListener("change", () => {
        setGeoPermission(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt");
      });
    }).catch(() => setGeoPermission("prompt"));
    return () => { ps?.removeEventListener("change", () => {}); };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    const hasRoute = routeSegments && routeSegments.length > 0;

    const center: [number, number] = lat != null && lng != null
      ? [lat, lng]
      : hasRoute ? (routeSegments![0].lines[0]?.[0] as [number, number]) || OCEANSIDE : OCEANSIDE;

    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    if (hasRoute) {
      const allPoints: [number, number][] = [];

      for (const rs of routeSegments!) {
        for (const line of rs.lines) {
          const coords = line as [number, number][];
          L.polyline(coords, { color: ROUTE_COLOR, weight: 5, opacity: 0.85 }).addTo(map);
          allPoints.push(...coords);
        }
      }

      if (lat == null || lng == null) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
      }
    }

    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    map.on("click", async (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setGpsError(null);
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
      }
      const label = await reverseGeocode(clickLat, clickLng);
      onPin(clickLat, clickLng, label);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [ready]);

  const getDeniedMsg = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    return isIOS ? (
      <>
        <strong>Location is blocked.</strong> To enable:
        <ol>
          <li>Open your iPhone <strong>Settings</strong> app</li>
          <li>Scroll down and tap <strong>Safari</strong></li>
          <li>Tap <strong>Location</strong></li>
          <li>Select <strong>Ask</strong> or <strong>Allow</strong></li>
          <li>Come back here and try again</li>
        </ol>
      </>
    ) : isAndroid ? (
      <>
        <strong>Location is blocked.</strong> To enable:
        <ol>
          <li>Tap the <strong>lock icon</strong> in your browser address bar</li>
          <li>Tap <strong>Permissions</strong> or <strong>Site settings</strong></li>
          <li>Set <strong>Location</strong> to <strong>Allow</strong></li>
          <li>Reload the page and try again</li>
        </ol>
      </>
    ) : (
      <>
        <strong>Location is blocked.</strong> Click the lock/info icon in your address bar, allow location for this site, then reload.
      </>
    );
  };

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Location not supported on this browser.");
      return;
    }
    if (geoPermission === "denied") {
      setGpsError(getDeniedMsg());
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const L = (window as any).L;
        const map = mapRef.current;
        if (map) {
          map.setView([latitude, longitude], 17);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            markerRef.current = L.marker([latitude, longitude]).addTo(map);
          }
        }
        const label = await reverseGeocode(latitude, longitude);
        onPin(latitude, longitude, label);
        setLocating(false);
        setGeoPermission("granted");
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setGeoPermission("denied");
          setGpsError(getDeniedMsg());
        } else if (err.code === 2) {
          setGpsError("Could not determine location. Try again outside.");
        } else {
          setGpsError("Location timed out. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className={s.pinMapWrap}>
      <div ref={containerRef} className={s.pinMap} />
      {geoPermission !== "checking" && (
        <button type="button" className={s.btnGps} onClick={handleEnableLocation} disabled={locating}>
          {locating ? "Locating…" : geoPermission === "granted" ? "📍 Use my location" : "📍 Enable location"}
        </button>
      )}
      {gpsError && <div className={s.gpsDenied}>{gpsError}</div>}
    </div>
  );
});

export default PinMap;
