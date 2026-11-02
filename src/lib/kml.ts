export type RouteCoord = [number, number];
export type RouteSegment = { name: string; lines: RouteCoord[][] };

export function parseCoordinateBlock(block: string): RouteCoord[] {
  const raw = block.replace(/<\/?coordinates>/g, "").trim();
  return raw
    .split(/\s+/)
    .map((p) => {
      const [lng, lat] = p.split(",").map(Number);
      return [lat, lng] as RouteCoord;
    })
    .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
}

export async function fetchRouteFromKml(
  mapUrl: string,
): Promise<RouteSegment[]> {
  const midMatch = mapUrl.match(/mid=([^&]+)/);
  if (!midMatch) return [];
  const kmlUrl = `https://www.google.com/maps/d/kml?mid=${midMatch[1]}&forcekml=1`;
  try {
    const res = await fetch(kmlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UrbanistBot/1.0)",
      },
    });
    if (!res.ok) return [];
    const kml = await res.text();
    const segments: RouteSegment[] = [];
    const folderRegex = /<Folder>([\s\S]*?)<\/Folder>/g;
    for (const folderMatch of kml.matchAll(folderRegex)) {
      const folder = folderMatch[1];
      const nameMatch = folder.match(
        /<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/,
      );
      const name = nameMatch?.[1]?.trim() || "";
      if (name.toLowerCase().includes("observation")) continue;
      const coordBlocks =
        folder.match(/<coordinates>[^<]+<\/coordinates>/g) || [];
      const lines: RouteCoord[][] = [];
      for (const cb of coordBlocks) {
        const points = parseCoordinateBlock(cb);
        if (points.length >= 2) lines.push(points);
      }
      if (lines.length > 0) {
        const existing = segments.find(
          (s) => s.name[0] === name[0] && /^\d/.test(name[0]),
        );
        if (existing) {
          existing.lines.push(...lines);
        } else {
          segments.push({ name, lines });
        }
      }
    }
    return segments;
  } catch {
    return [];
  }
}
