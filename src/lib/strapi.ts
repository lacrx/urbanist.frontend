import fs from "node:fs";
import path from "node:path";
import { GraphQLClient } from "graphql-request";
import { ordinal } from "../utils";
import { processHtml } from "./html";
import { fetchRouteFromKml, type RouteSegment } from "./kml";
import { fetchUpcomingMeetupEvents } from "./meetup";
import type { SiteConfig } from "../site-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArticleBlock = {
  kind: "rich-text" | "visualization";
  html?: string;
  vizId?: string;
  caption?: string | null;
  height?: number | null;
  align?: string | null;
};

export type Article = {
  title: string;
  description: string;
  slug: string;
  coverUrl: string | null;
  coverIsFallback: boolean;
  authorName: string | null;
  blocks: ArticleBlock[];
  publishedAt: string;
};

export type Visualization = {
  vizId: string;
  type: string;
  title: string;
  source: string | null;
  data: unknown;
  config: unknown;
  [key: string]: unknown;
};

export type Event = {
  title: string;
  description: string;
  url: string;
  location: string;
  startDate: string;
  startDateDisplay: string;
  endDate: string | null;
  imageUrl: string | null;
};

export type SiteSettings = {
  instagramUrl: string | null;
  meetupUrl: string | null;
};

export type WalkAudit = {
  title: string;
  slug: string;
  date: string;
  status: "active" | "completed";
  description: string | null;
  mapUrl: string | null;
  segments: { name: string }[];
  routeSegments: RouteSegment[];
};

export type DataPage = {
  title: string;
  description: string | null;
  slug: string;
  dashboardType: string;
  coverUrl: string | null;
  blocks: ArticleBlock[];
  methodologyHtml: string | null;
  dataUpdatedAt: string | null;
  sortOrder: number;
};

// ---------------------------------------------------------------------------
// Strapi response types
// ---------------------------------------------------------------------------

type StrapiBlock =
  | { __typename: "ComponentSharedRichText"; body: string }
  | {
      __typename: "ComponentSharedVisualization";
      visualization?: { vizId: string } | null;
      vizId?: string;
      caption: string | null;
      height: number | null;
      align: string | null;
    };

type StrapiArticle = {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  cover: { url: string } | null;
  authors: { name: string }[];
  blocks: StrapiBlock[];
  publishedAt: string;
};

type StrapiVisualization = {
  documentId: string;
  vizId: string;
  title: string;
  type: string;
  source: string | null;
  data: unknown;
  config: unknown;
};

type StrapiEvent = {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  date: string;
  location: string | null;
  url: string | null;
  cover: { url: string } | null;
};

type StrapiWalkAudit = {
  title: string;
  slug: string;
  date: string;
  status: "active" | "completed";
  description: string | null;
  mapUrl: string | null;
  segments: { name: string }[];
};

type StrapiDataPage = {
  documentId: string;
  title: string;
  description: string | null;
  slug: string;
  dashboardType: string;
  cover: { url: string } | null;
  blocks: StrapiBlock[];
  methodology: string | null;
  dataUpdatedAt: string | null;
  sortOrder: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_TIMEZONE = "America/Los_Angeles";

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = Number(parts.find((p) => p.type === "day")!.value);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${weekday}, ${month} ${ordinal(day)} at ${timeStr}`;
}

function extractVizId(
  block: StrapiBlock,
  config: SiteConfig,
): string | undefined {
  if (block.__typename !== "ComponentSharedVisualization") return undefined;
  if (config.build.vizBlockNested) {
    return (block as { visualization?: { vizId: string } | null }).visualization
      ?.vizId;
  }
  return (block as { vizId?: string }).vizId;
}

function resolveBlocks(blocks: StrapiBlock[], config: SiteConfig): ArticleBlock[] {
  return blocks.map((block) => {
    if (block.__typename === "ComponentSharedRichText") {
      return { kind: "rich-text" as const, html: processHtml(block.body, config) };
    }
    return {
      kind: "visualization" as const,
      vizId: extractVizId(block, config),
      caption: block.caption,
      height: block.height,
      align: block.align,
    };
  });
}

function resolveCoverUrl(
  cover: { url: string } | null,
  strapiUrl: string,
): string | null {
  if (!cover?.url) return null;
  return cover.url.startsWith("http") ? cover.url : `${strapiUrl}${cover.url}`;
}

// ---------------------------------------------------------------------------
// GraphQL queries
// ---------------------------------------------------------------------------

function buildArticleQuery(config: SiteConfig): string {
  const paginationClause = config.build.pagination.pageSize
    ? `, pagination: { pageSize: ${config.build.pagination.pageSize} }`
    : "";

  const vizBlock = config.build.vizBlockNested
    ? `...on ComponentSharedVisualization {
          visualization { vizId }
          caption
          height
          align
        }`
    : `...on ComponentSharedVisualization {
          vizId
          caption
          height
          align
        }`;

  return `
    query GetAllStrapiArticles {
      articles(sort: ["publishedAt:desc"], status: PUBLISHED${paginationClause}) {
        documentId
        title
        description
        slug
        cover { url }
        authors { name }
        blocks {
          __typename
          ...on ComponentSharedRichText { body }
          ${vizBlock}
        }
        publishedAt
      }
    }
  `;
}

const VISUALIZATIONS_QUERY = `
  query GetAllStrapiVisualizations {
    visualizations(status: PUBLISHED, pagination: { pageSize: 100 }) {
      documentId
      vizId
      title
      type
      source
      data
      config
    }
  }
`;

const EVENTS_QUERY = `
  query GetAllStrapiEvents {
    events(sort: ["date:asc"], status: PUBLISHED) {
      documentId
      title
      description
      slug
      date
      location
      url
      cover { url }
    }
  }
`;

const SITE_SETTING_QUERY = `
  query GetStrapiSiteSetting {
    siteSetting {
      instagramUrl
      meetupUrl
    }
  }
`;

const WALK_AUDITS_QUERY = `
  query GetAllStrapiWalkAudits {
    walkAudits(filters: { status: { ne: "draft" } }, status: PUBLISHED, sort: ["date:desc"]) {
      title
      slug
      date
      status
      description
      mapUrl
      segments { name }
    }
  }
`;

const DATA_PAGES_QUERY = `
  query GetAllStrapiDataPages {
    dataPages(sort: ["sortOrder:asc"], status: PUBLISHED, pagination: { pageSize: 100 }) {
      documentId
      title
      description
      slug
      dashboardType
      cover { url }
      blocks {
        __typename
        ...on ComponentSharedRichText { body }
        ...on ComponentSharedVisualization {
          vizId
          caption
          height
          align
        }
      }
      methodology
      dataUpdatedAt
      sortOrder
    }
  }
`;

// ---------------------------------------------------------------------------
// Cached fetchers
// ---------------------------------------------------------------------------

let _client: GraphQLClient | null = null;
function getClient(): GraphQLClient {
  if (_client) return _client;
  const strapiUrl = process.env.STRAPI_URL || "http://localhost:1337";
  _client = new GraphQLClient(`${strapiUrl}/graphql`);
  return _client;
}

function getStrapiUrl(): string {
  return process.env.STRAPI_URL || "http://localhost:1337";
}

let _articles: Article[] | null = null;
export async function fetchArticles(config: SiteConfig): Promise<Article[]> {
  if (_articles) return _articles;
  const client = getClient();
  const strapiUrl = getStrapiUrl();
  try {
    const result = await client.request<{ articles: StrapiArticle[] }>(
      buildArticleQuery(config),
    );
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    _articles = result.articles.filter((a) => {
      if (seenIds.has(a.documentId) || seenSlugs.has(a.slug)) return false;
      seenIds.add(a.documentId);
      seenSlugs.add(a.slug);
      return true;
    }).map((a) => {
      let coverUrl = resolveCoverUrl(a.cover, strapiUrl);
      let coverIsFallback = false;
      if (!coverUrl) {
        const fallbackBase = config.build.coverFallbacks[a.slug];
        if (fallbackBase) {
          coverUrl = `/images/${fallbackBase}`;
          coverIsFallback = true;
        }
      }
      return {
        title: a.title,
        description: a.description,
        slug: a.slug,
        coverUrl,
        coverIsFallback,
        authorName: a.authors?.length
          ? a.authors.map((au) => au.name).join(" & ")
          : null,
        blocks: resolveBlocks(a.blocks, config),
        publishedAt: a.publishedAt,
      };
    });
  } catch (err) {
    console.warn(
      `[strapi] Skipping articles: ${(err as Error).message}`,
    );
    _articles = [];
  }
  return _articles;
}

let _visualizations: Visualization[] | null = null;
export async function fetchVisualizations(): Promise<Visualization[]> {
  if (_visualizations) return _visualizations;
  const client = getClient();
  const strapiVizIds = new Set<string>();

  try {
    const result = await client.request<{
      visualizations: StrapiVisualization[];
    }>(VISUALIZATIONS_QUERY);
    _visualizations = result.visualizations.map((v) => {
      strapiVizIds.add(v.vizId);
      const configObj =
        v.config && typeof v.config === "object"
          ? (v.config as Record<string, unknown>)
          : {};
      return {
        vizId: v.vizId,
        type: v.type,
        title: v.title,
        source: v.source,
        data: v.data,
        config: v.config,
        ...configObj,
      };
    });
  } catch (err) {
    console.warn(
      `[strapi] Skipping visualizations: ${(err as Error).message}`,
    );
    _visualizations = [];
  }

  // Local visualization artifacts
  const visualizationsDir = path.resolve("src/assets/visualizations");
  if (fs.existsSync(visualizationsDir)) {
    for (const vizDir of fs.readdirSync(visualizationsDir)) {
      const artifactPath = path.join(visualizationsDir, vizDir, "artifact.json");
      if (!fs.existsSync(artifactPath)) continue;
      if (strapiVizIds.has(vizDir)) continue;
      try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        _visualizations.push(artifact);
      } catch (err) {
        console.warn(
          `[strapi] Skipping visualization ${vizDir}: ${(err as Error).message}`,
        );
      }
    }
  }

  return _visualizations;
}

let _events: Event[] | null = null;
export async function fetchEvents(config: SiteConfig): Promise<Event[]> {
  if (_events) return _events;
  const now = Date.now();

  if (config.build.eventSource === "strapi") {
    const client = getClient();
    const strapiUrl = getStrapiUrl();
    try {
      const result = await client.request<{ events: StrapiEvent[] }>(
        EVENTS_QUERY,
      );
      _events = result.events
        .filter((ev) => new Date(ev.date).getTime() > now)
        .map((ev) => ({
          title: ev.title,
          description: ev.description || "",
          url: ev.url || "/events",
          location: ev.location || "",
          startDate: ev.date,
          startDateDisplay: formatEventDate(ev.date),
          endDate: null,
          imageUrl: resolveCoverUrl(ev.cover, strapiUrl),
        }));
    } catch (err) {
      console.warn(
        `[strapi] Skipping events: ${(err as Error).message}`,
      );
      _events = [];
    }
  } else if (config.build.eventSource === "meetup") {
    const groupUrl =
      config.build.meetupGroupUrl || "north-county-urbanists";
    try {
      const meetupEvents = await fetchUpcomingMeetupEvents(groupUrl, 5);
      _events = meetupEvents.map((e) => {
        const locationParts = [
          e.location?.name,
          e.location?.address?.addressLocality,
        ].filter(Boolean);
        return {
          title: e.name,
          description: e.description || "",
          url: e.url,
          location: locationParts.join(", "),
          startDate: e.startDate,
          startDateDisplay: formatEventDate(e.startDate),
          endDate: e.endDate || null,
          imageUrl: e.imageUrl || null,
        };
      });
    } catch (err) {
      console.warn(
        `[strapi] Skipping Meetup events: ${(err as Error).message}`,
      );
      _events = [];
    }
  } else {
    _events = [];
  }

  return _events;
}

let _siteSettings: SiteSettings | null = null;
export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (_siteSettings) return _siteSettings;
  const client = getClient();
  try {
    const result = await client.request<{
      siteSetting: { instagramUrl: string | null; meetupUrl: string | null } | null;
    }>(SITE_SETTING_QUERY);
    _siteSettings = {
      instagramUrl: result.siteSetting?.instagramUrl ?? null,
      meetupUrl: result.siteSetting?.meetupUrl ?? null,
    };
  } catch (err) {
    console.warn(
      `[strapi] Skipping site settings: ${(err as Error).message}`,
    );
    _siteSettings = { instagramUrl: null, meetupUrl: null };
  }
  return _siteSettings;
}

let _walkAudits: WalkAudit[] | null = null;
export async function fetchWalkAudits(): Promise<WalkAudit[]> {
  if (_walkAudits) return _walkAudits;
  const client = getClient();
  try {
    const result = await client.request<{
      walkAudits: StrapiWalkAudit[];
    }>(WALK_AUDITS_QUERY);
    _walkAudits = await Promise.all(
      result.walkAudits.map(async (audit) => {
        let routeSegments: RouteSegment[] = [];
        if (audit.mapUrl) {
          routeSegments = await fetchRouteFromKml(audit.mapUrl);
        }
        return { ...audit, routeSegments };
      }),
    );
  } catch (err) {
    console.warn(
      `[strapi] Skipping walk audits: ${(err as Error).message}`,
    );
    _walkAudits = [];
  }
  return _walkAudits;
}

let _dataPages: DataPage[] | null = null;
export async function fetchDataPages(config: SiteConfig): Promise<DataPage[]> {
  if (_dataPages) return _dataPages;
  const client = getClient();
  const strapiUrl = getStrapiUrl();
  try {
    const result = await client.request<{
      dataPages: StrapiDataPage[];
    }>(DATA_PAGES_QUERY);
    _dataPages = result.dataPages.map((dp) => ({
      title: dp.title,
      description: dp.description,
      slug: dp.slug,
      dashboardType: dp.dashboardType,
      coverUrl: resolveCoverUrl(dp.cover, strapiUrl),
      blocks: resolveBlocks(dp.blocks, config),
      methodologyHtml: dp.methodology
        ? processHtml(dp.methodology, config)
        : null,
      dataUpdatedAt: dp.dataUpdatedAt,
      sortOrder: dp.sortOrder,
    }));
  } catch (err) {
    console.warn(
      `[strapi] Skipping data pages: ${(err as Error).message}`,
    );
    _dataPages = [];
  }
  return _dataPages;
}
