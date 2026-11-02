type MeetupEventJsonLd = {
  "@type": string;
  name: string;
  url: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
    };
  };
};

export type MeetupEvent = MeetupEventJsonLd & { imageUrl?: string };

function buildEventImageMap(nextData: unknown): Record<string, string> {
  const photos: Record<string, string> = {};
  const events: Array<{ url: string; photoId?: string }> = [];

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, any>;
    if (obj.__typename === "PhotoInfo" && obj.id && obj.highResUrl) {
      photos[obj.id] = obj.highResUrl;
    }
    if (obj.__typename === "Event" && obj.eventUrl) {
      const photoRef =
        obj.displayPhoto?.__ref || obj.featuredEventPhoto?.__ref;
      const photoId =
        typeof photoRef === "string"
          ? photoRef.replace("PhotoInfo:", "")
          : undefined;
      events.push({ url: obj.eventUrl, photoId });
    }
    Object.values(obj).forEach(walk);
  };
  walk(nextData);

  const map: Record<string, string> = {};
  for (const e of events) {
    if (e.photoId && photos[e.photoId]) map[e.url] = photos[e.photoId];
  }
  return map;
}

export async function fetchUpcomingMeetupEvents(
  groupUrl: string,
  limit = 5,
): Promise<MeetupEvent[]> {
  const url = `https://www.meetup.com/${groupUrl}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; UrbanistBot/1.0)",
    },
  });
  if (!res.ok) throw new Error(`Meetup page returned ${res.status}`);
  const html = await res.text();

  const events: MeetupEventJsonLd[] = [];
  const scriptRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(scriptRegex)) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] === "Event" && item.startDate)
          events.push(item);
      }
    } catch {
      // ignore unparsable blocks
    }
  }

  let imageMap: Record<string, string> = {};
  const nextMatch = html.match(
    /__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (nextMatch) {
    try {
      imageMap = buildEventImageMap(JSON.parse(nextMatch[1]));
    } catch {
      // structure may have changed; continue without images
    }
  }

  const now = Date.now();
  return events
    .filter((e) => new Date(e.startDate).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    .slice(0, limit)
    .map((e) => ({ ...e, imageUrl: imageMap[e.url] }));
}
