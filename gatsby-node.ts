import fs from "fs";
import path from "path";
import { marked } from "marked";
import { sanitize } from "isomorphic-dompurify";
import { type GatsbyNode } from "gatsby";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import { GraphQLClient } from "graphql-request";
import { ordinal } from "./src/utils";
import type { SiteConfig } from "./src/site-config";
import ncyimbyConfig from "./sites/ncyimby/config";
import stosideConfig from "./sites/stoside/config";

const SITE = process.env.SITE || "ncyimby";
const siteConfig: SiteConfig = SITE === "stoside" ? stosideConfig : ncyimbyConfig;

// ---------------------------------------------------------------------------
// Substack responsive srcset (stoside only)
// ---------------------------------------------------------------------------

const SUBSTACK_CDN_RE = /(<img\s[^>]*src=")(https:\/\/substackcdn\.com\/image\/fetch\/[^/]+\/)(https%3A[^"]+)("[^>]*>)/g;
function addResponsiveSrcset(html: string): string {
  const CDN = "https://substackcdn.com/image/fetch/";
  const OPTS = ",c_limit,f_auto,q_auto:good,fl_progressive:steep/";
  return html.replace(SUBSTACK_CDN_RE, (_match, pre, _cdnUrl, encodedSrc, post) => {
    const s300 = `${CDN}w_300${OPTS}${encodedSrc}`;
    const s600 = `${CDN}w_600${OPTS}${encodedSrc}`;
    const s1200 = `${CDN}w_1200${OPTS}${encodedSrc}`;
    const srcset = `${s300} 300w, ${s600} 600w, ${s1200} 1200w`;
    const sizes = "(max-width: 600px) 100vw, 600px";
    return `${pre}${s600}${post.replace(">", ` srcset="${srcset}" sizes="${sizes}" loading="lazy">`)}`;
  });
}

function processHtml(body: string): string {
  const html = sanitize(marked.parse(body) as string);
  return siteConfig.build.substackSrcset ? addResponsiveSrcset(html) : html;
}

if (siteConfig.build.substackSrcset) {
  marked.use({
    renderer: {
      list(token) {
        if (token.ordered) return false;
        return token.items
          .map(item => {
            const inner = this.parser.parse(item.tokens).replace(/^<p>|<\/p>\s*$/g, "").trim();
            return `<p>${inner}</p>\n`;
          })
          .join("");
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Webpack config
// ---------------------------------------------------------------------------

export function onCreateWebpackConfig({
  actions,
  getConfig,
}: Parameters<NonNullable<GatsbyNode["onCreateWebpackConfig"]>>[0]) {
  const config = getConfig();
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias["@/site"] = path.resolve(__dirname, `sites/${SITE}`);
  config.resolve.alias["@"] = path.resolve(__dirname, "src");
  actions.replaceWebpackConfig(config);
}

// ---------------------------------------------------------------------------
// GraphQL queries
// ---------------------------------------------------------------------------

function buildArticleQuery(): string {
  const paginationClause = siteConfig.build.pagination.pageSize
    ? `, pagination: { pageSize: ${siteConfig.build.pagination.pageSize} }`
    : "";

  const vizBlock = siteConfig.build.vizBlockNested
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
      articles(sort: ["publishedAt:desc"]${paginationClause}) {
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

const getAllStrapiVisualizations = `
  query GetAllStrapiVisualizations {
    visualizations(pagination: { pageSize: 100 }) {
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

const getAllStrapiEvents = `
  query GetAllStrapiEvents {
    events(sort: ["date:asc"]) {
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

const getStrapiSiteSetting = `
  query GetStrapiSiteSetting {
    siteSetting {
      instagramUrl
      meetupUrl
    }
  }
`;

const getAllStrapiWalkAudits = `
  query GetAllStrapiWalkAudits {
    walkAudits(filters: { status: { ne: "draft" } }, sort: ["date:desc"]) {
      title
      slug
      date
      status
      description
      mapUrl
      segments { name }
      summary
    }
  }
`;

const getAllStrapiDataPages = `
  query GetAllStrapiDataPages {
    dataPages(sort: ["sortOrder:asc"], pagination: { pageSize: 100 }) {
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
// Types
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

type StrapiVisualization = {
  documentId: string;
  vizId: string;
  title: string;
  type: string;
  source: string | null;
  data: unknown;
  config: unknown;
};
interface VisualizationResponse {
  visualizations: StrapiVisualization[];
}

type UploadFile = { url: string };
type Article = {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  cover: UploadFile;
  authors: { name: string }[];
  blocks: StrapiBlock[];
  publishedAt: Date;
};
interface ArticleResponse {
  articles: Article[];
}

type ArticleBlock = {
  kind: "rich-text" | "visualization";
  html?: string;
  vizId?: string;
  caption?: string | null;
  height?: number | null;
  align?: string | null;
};
type GatsbyArticle = {
  title: string;
  description: string;
  slug: string;
  image: string | undefined;
  coverIsFallback?: boolean;
  authorName: string | null;
  blocks: ArticleBlock[];
  publishedAt: Date;
};
interface GatsbyArticles {
  allGatsbyArticle: { nodes: GatsbyArticle[] };
}

type DataPage = {
  documentId: string;
  title: string;
  description: string | null;
  slug: string;
  dashboardType: string;
  cover: UploadFile | null;
  blocks: StrapiBlock[];
  methodology: string | null;
  dataUpdatedAt: string | null;
  sortOrder: number;
};
interface DataPageResponse {
  dataPages: DataPage[];
}
type GatsbyDataPage = {
  title: string;
  description: string | null;
  slug: string;
  dashboardType: string;
  image: string | undefined;
  blocks: ArticleBlock[];
  methodologyHtml: string | null;
  dataUpdatedAt: string | null;
  sortOrder: number;
};
interface GatsbyDataPages {
  allGatsbyDataPage: { nodes: GatsbyDataPage[] };
}

interface SiteSettingResponse {
  siteSetting: {
    instagramUrl: string | null;
    meetupUrl: string | null;
  } | null;
}

type StrapiEvent = {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  date: string;
  location: string | null;
  url: string | null;
  cover: UploadFile | null;
};
interface StrapiEventResponse {
  events: StrapiEvent[];
}

type WalkAuditSegment = { name: string };
type RouteCoord = [number, number];
type RouteSegment = { name: string; lines: RouteCoord[][] };
type StrapiWalkAudit = {
  title: string;
  slug: string;
  date: string;
  status: "active" | "completed";
  description: string | null;
  mapUrl: string | null;
  segments: WalkAuditSegment[];
  summary: string | null;
};
interface WalkAuditResponse {
  walkAudits: StrapiWalkAudit[];
}

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
type MeetupEvent = MeetupEventJsonLd & { imageUrl?: string };

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
  const weekday = parts.find(p => p.type === "weekday")!.value;
  const month = parts.find(p => p.type === "month")!.value;
  const day = Number(parts.find(p => p.type === "day")!.value);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${weekday}, ${month} ${ordinal(day)} at ${timeStr}`;
}

function extractVizId(block: StrapiBlock): string | undefined {
  if (block.__typename !== "ComponentSharedVisualization") return undefined;
  if (siteConfig.build.vizBlockNested) {
    return (block as { visualization?: { vizId: string } | null }).visualization?.vizId;
  }
  return (block as { vizId?: string }).vizId;
}

// ---------------------------------------------------------------------------
// Walk audit KML fetching (stoside only)
// ---------------------------------------------------------------------------

function parseCoordinateBlock(block: string): RouteCoord[] {
  const raw = block.replace(/<\/?coordinates>/g, "").trim();
  return raw
    .split(/\s+/)
    .map(p => {
      const [lng, lat] = p.split(",").map(Number);
      return [lat, lng] as RouteCoord;
    })
    .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
}

async function fetchRouteFromKml(mapUrl: string): Promise<RouteSegment[]> {
  const midMatch = mapUrl.match(/mid=([^&]+)/);
  if (!midMatch) return [];
  const kmlUrl = `https://www.google.com/maps/d/kml?mid=${midMatch[1]}&forcekml=1`;
  try {
    const res = await fetch(kmlUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UrbanistBot/1.0)" },
    });
    if (!res.ok) return [];
    const kml = await res.text();
    const segments: RouteSegment[] = [];
    const folderRegex = /<Folder>([\s\S]*?)<\/Folder>/g;
    for (const folderMatch of kml.matchAll(folderRegex)) {
      const folder = folderMatch[1];
      const nameMatch = folder.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/);
      const name = nameMatch?.[1]?.trim() || "";
      if (name.toLowerCase().includes("observation")) continue;
      const coordBlocks = folder.match(/<coordinates>[^<]+<\/coordinates>/g) || [];
      const lines: RouteCoord[][] = [];
      for (const cb of coordBlocks) {
        const points = parseCoordinateBlock(cb);
        if (points.length >= 2) lines.push(points);
      }
      if (lines.length > 0) {
        const existing = segments.find(s => s.name[0] === name[0] && /^\d/.test(name[0]));
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

// ---------------------------------------------------------------------------
// Meetup event scraping (stoside only)
// ---------------------------------------------------------------------------

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
      const photoRef = obj.displayPhoto?.__ref || obj.featuredEventPhoto?.__ref;
      const photoId = typeof photoRef === "string" ? photoRef.replace("PhotoInfo:", "") : undefined;
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

async function fetchUpcomingMeetupEvents(groupUrl: string, limit = 5): Promise<MeetupEvent[]> {
  const url = `https://www.meetup.com/${groupUrl}/`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; UrbanistBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Meetup page returned ${res.status}`);
  const html = await res.text();

  const events: MeetupEventJsonLd[] = [];
  const scriptRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(scriptRegex)) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] === "Event" && item.startDate) events.push(item);
      }
    } catch {
      // ignore unparsable blocks
    }
  }

  let imageMap: Record<string, string> = {};
  const nextMatch = html.match(/__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      imageMap = buildEventImageMap(JSON.parse(nextMatch[1]));
    } catch {
      // structure may have changed; continue without images
    }
  }

  const now = Date.now();
  return events
    .filter(e => new Date(e.startDate).getTime() > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, limit)
    .map(e => ({ ...e, imageUrl: imageMap[e.url] }));
}

// ---------------------------------------------------------------------------
// Source nodes
// ---------------------------------------------------------------------------

export async function sourceNodes({
  actions: { createNode },
  createContentDigest,
  createNodeId,
  getCache,
  getNodesByType,
}: Parameters<NonNullable<GatsbyNode["sourceNodes"]>>[0]) {
  const strapiUrl = process.env.STRAPI_URL || "http://localhost:1337";
  const strapiGraphqlClient = new GraphQLClient(`${strapiUrl}/graphql`);

  // -- Articles --
  let articles: Article[] = [];
  try {
    const articleResult = await strapiGraphqlClient.request<ArticleResponse>(buildArticleQuery());
    articles = articleResult.articles;
  } catch (err) {
    console.warn(`[gatsby-node] Skipping Strapi articles: could not reach ${strapiUrl}. ${(err as Error).message}`);
  }

  // -- Site settings --
  try {
    const settingResult = await strapiGraphqlClient.request<SiteSettingResponse>(getStrapiSiteSetting);
    const setting = settingResult.siteSetting;
    const gatsbySiteSetting = {
      instagramUrl: setting?.instagramUrl ?? null,
      meetupUrl: setting?.meetupUrl ?? null,
    };
    createNode({
      ...gatsbySiteSetting,
      id: createNodeId("site-setting"),
      internal: {
        type: "GatsbySiteSetting",
        contentDigest: createContentDigest(gatsbySiteSetting),
      },
    });
  } catch (err) {
    console.warn(`[gatsby-node] Skipping Strapi site settings: ${(err as Error).message}`);
  }

  // -- Article cover images (with optional fallbacks) --
  const hasFallbacks = Object.keys(siteConfig.build.coverFallbacks).length > 0;

  const images = articles.length === 0
    ? []
    : await Promise.all(
        articles.map(async article => {
          if (!article?.cover?.url) {
            if (hasFallbacks) {
              const fallbackBase = siteConfig.build.coverFallbacks[article.slug];
              if (fallbackBase) {
                const fileNode = getNodesByType("File").find(
                  (n: Record<string, unknown>) => n.base === fallbackBase,
                );
                return { id: fileNode?.id as string | undefined, fallback: true };
              }
            }
            return { id: undefined, fallback: false };
          }
          const coverUrl = article.cover.url.startsWith("http")
            ? article.cover.url
            : `${strapiUrl}${article.cover.url}`;
          return {
            id: (
              await createRemoteFileNode({
                url: coverUrl,
                createNode,
                createNodeId,
                getCache,
              })
            ).id,
            fallback: false,
          };
        }),
      );

  // -- Create article nodes --
  articles.forEach(({ title, description, slug, blocks, authors, publishedAt }, i) => {
    const structuredBlocks: ArticleBlock[] = blocks.map(block => {
      if (block.__typename === "ComponentSharedRichText") {
        return { kind: "rich-text", html: processHtml(block.body) };
      }
      return {
        kind: "visualization",
        vizId: extractVizId(block),
        caption: block.caption,
        height: block.height,
        align: block.align,
      };
    });

    const gatsbyArticle: GatsbyArticle = {
      title,
      description,
      slug,
      image: images[i]?.id,
      coverIsFallback: images[i]?.fallback ?? false,
      authorName: authors?.length ? authors.map(a => a.name).join(" & ") : null,
      blocks: structuredBlocks,
      publishedAt,
    };

    createNode({
      ...gatsbyArticle,
      id: createNodeId(gatsbyArticle.slug),
      internal: {
        type: "GatsbyArticle",
        contentDigest: createContentDigest(gatsbyArticle),
      },
    });
  });

  // -- Visualizations (shared) --
  const strapiVizIds = new Set<string>();
  try {
    const vizResult = await strapiGraphqlClient.request<VisualizationResponse>(getAllStrapiVisualizations);
    for (const viz of vizResult.visualizations) {
      strapiVizIds.add(viz.vizId);
      const configObj =
        viz.config && typeof viz.config === "object" ? (viz.config as Record<string, unknown>) : {};
      createNode({
        vizId: viz.vizId,
        type: viz.type,
        title: viz.title,
        source: viz.source,
        data: viz.data,
        config: viz.config,
        ...configObj,
        id: createNodeId(`viz-${viz.vizId}`),
        internal: {
          type: "GatsbyVisualization",
          contentDigest: createContentDigest(viz),
        },
      });
    }
  } catch (err) {
    console.warn(`[gatsby-node] Skipping Strapi visualizations: ${(err as Error).message}`);
  }

  // -- Local visualization artifacts --
  const visualizationsDir = path.resolve(__dirname, "src/assets/visualizations");
  if (fs.existsSync(visualizationsDir)) {
    for (const vizDir of fs.readdirSync(visualizationsDir)) {
      const artifactPath = path.join(visualizationsDir, vizDir, "artifact.json");
      if (!fs.existsSync(artifactPath)) continue;
      if (strapiVizIds.has(vizDir)) continue;
      try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        createNode({
          ...artifact,
          id: createNodeId(`viz-${artifact.vizId}`),
          internal: {
            type: "GatsbyVisualization",
            contentDigest: createContentDigest(artifact),
          },
        });
      } catch (err) {
        console.warn(`[gatsby-node] Skipping visualization ${vizDir}: ${(err as Error).message}`);
      }
    }
  }

  // -- Events (pluggable source) --
  if (siteConfig.build.eventSource === "strapi") {
    try {
      const eventResult = await strapiGraphqlClient.request<StrapiEventResponse>(getAllStrapiEvents);
      const now = Date.now();
      for (const ev of eventResult.events) {
        if (new Date(ev.date).getTime() <= now) continue;

        let imageNodeId: string | undefined;
        if (ev.cover?.url) {
          const coverUrl = ev.cover.url.startsWith("http")
            ? ev.cover.url
            : `${strapiUrl}${ev.cover.url}`;
          try {
            const imageNode = await createRemoteFileNode({
              url: coverUrl,
              createNode,
              createNodeId,
              getCache,
            });
            imageNodeId = imageNode.id;
          } catch (err) {
            console.warn(`[gatsby-node] Could not fetch image for event "${ev.title}": ${(err as Error).message}`);
          }
        }

        const eventUrl = ev.url || "/events";
        const gatsbyEvent = {
          title: ev.title,
          description: ev.description || "",
          url: eventUrl,
          location: ev.location || "",
          startDate: ev.date,
          startDateDisplay: formatEventDate(ev.date),
          endDate: null,
          image: imageNodeId,
        };

        createNode({
          ...gatsbyEvent,
          id: createNodeId(`strapi-event-${ev.documentId}`),
          internal: {
            type: "GatsbyEvent",
            contentDigest: createContentDigest(gatsbyEvent),
          },
        });
      }
    } catch (err) {
      console.warn(`[gatsby-node] Skipping Strapi events: ${(err as Error).message}`);
    }
  } else if (siteConfig.build.eventSource === "meetup") {
    const groupUrl = siteConfig.build.meetupGroupUrl || "north-county-urbanists";
    try {
      const meetupEvents = await fetchUpcomingMeetupEvents(groupUrl, 5);
      for (const event of meetupEvents) {
        const locationParts = [
          event.location?.name,
          event.location?.address?.addressLocality,
        ].filter(Boolean);

        let imageNodeId: string | undefined;
        if (event.imageUrl) {
          try {
            const imageNode = await createRemoteFileNode({
              url: event.imageUrl,
              createNode,
              createNodeId,
              getCache,
            });
            imageNodeId = imageNode.id;
          } catch (err) {
            console.warn(`[gatsby-node] Could not fetch image for "${event.name}": ${(err as Error).message}`);
          }
        }

        const gatsbyEvent = {
          title: event.name,
          description: event.description || "",
          url: event.url,
          location: locationParts.join(", "),
          startDate: event.startDate,
          startDateDisplay: formatEventDate(event.startDate),
          endDate: event.endDate || null,
          image: imageNodeId,
        };

        createNode({
          ...gatsbyEvent,
          id: createNodeId(`meetup-${event.url}`),
          internal: {
            type: "GatsbyEvent",
            contentDigest: createContentDigest(gatsbyEvent),
          },
        });
      }
    } catch (err) {
      console.warn(`[gatsby-node] Skipping Meetup events: ${(err as Error).message}`);
    }
  }

  // -- Walk audits (stoside only) --
  if (siteConfig.build.walkAudit) {
    try {
      const walkAuditResult = await strapiGraphqlClient.request<WalkAuditResponse>(getAllStrapiWalkAudits);
      for (const audit of walkAuditResult.walkAudits) {
        let routeSegments: RouteSegment[] = [];
        if (audit.mapUrl) {
          routeSegments = await fetchRouteFromKml(audit.mapUrl);
        }
        createNode({
          ...audit,
          routeSegments,
          id: createNodeId(`walk-audit-${audit.slug}`),
          internal: {
            type: "GatsbyWalkAudit",
            contentDigest: createContentDigest({ ...audit, routeSegments }),
          },
        });
      }
    } catch (err) {
      console.warn(`[gatsby-node] Skipping Strapi walk audits: ${(err as Error).message}`);
    }
  }

  // -- Data pages (stoside only) --
  if (siteConfig.build.dataPages) {
    let dataPages: DataPage[] = [];
    try {
      const dataPageResult = await strapiGraphqlClient.request<DataPageResponse>(getAllStrapiDataPages);
      dataPages = dataPageResult.dataPages;
    } catch (err) {
      console.warn(`[gatsby-node] Skipping Strapi data pages: ${(err as Error).message}`);
    }

    const dataPageImages =
      dataPages.length === 0
        ? []
        : await Promise.all(
            dataPages.map(async dp => {
              if (!dp?.cover?.url) return undefined;
              const coverUrl = dp.cover.url.startsWith("http")
                ? dp.cover.url
                : `${strapiUrl}${dp.cover.url}`;
              return (
                await createRemoteFileNode({
                  url: coverUrl,
                  createNode,
                  createNodeId,
                  getCache,
                })
              ).id;
            }),
          );

    dataPages.forEach((dp, i) => {
      const structuredBlocks: ArticleBlock[] = dp.blocks.map(block => {
        if (block.__typename === "ComponentSharedRichText") {
          return { kind: "rich-text", html: processHtml(block.body) };
        }
        return {
          kind: "visualization",
          vizId: extractVizId(block),
          caption: block.caption,
          height: block.height,
          align: block.align,
        };
      });

      const methodologyHtml = dp.methodology ? processHtml(dp.methodology) : null;

      const gatsbyDataPage: GatsbyDataPage = {
        title: dp.title,
        description: dp.description,
        slug: dp.slug,
        dashboardType: dp.dashboardType,
        image: dataPageImages[i],
        blocks: structuredBlocks,
        methodologyHtml,
        dataUpdatedAt: dp.dataUpdatedAt,
        sortOrder: dp.sortOrder,
      };

      createNode({
        ...gatsbyDataPage,
        id: createNodeId(`data-page-${dp.slug}`),
        internal: {
          type: "GatsbyDataPage",
          contentDigest: createContentDigest(gatsbyDataPage),
        },
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Page creation
// ---------------------------------------------------------------------------

const articleTemplate = path.resolve("./src/templates/article.tsx");

export async function createPages({
  actions: { createPage },
  graphql,
}: Parameters<NonNullable<GatsbyNode["createPages"]>>[0]) {
  // -- Article pages --
  const allGatsbyArticle = await graphql<GatsbyArticles>(`
    query AllGatsbyArticle {
      allGatsbyArticle {
        nodes {
          title
          description
          slug
          coverIsFallback
          image {
            childImageSharp {
              gatsbyImageData(
                width: 1050
                height: 600
                layout: CONSTRAINED
                placeholder: BLURRED
                formats: [AUTO, WEBP, AVIF]
                transformOptions: { fit: COVER, cropFocus: CENTER }
              )
            }
          }
          blocks {
            kind
            html
            vizId
            caption
            height
            align
          }
          authorName
          publishedAt
        }
      }
    }
  `);

  allGatsbyArticle?.data?.allGatsbyArticle?.nodes?.forEach(article => {
    createPage({
      path: `/articles/${article?.slug}`,
      component: articleTemplate,
      context: article,
    });
  });

  // -- Walk audit pages (stoside only) --
  if (siteConfig.build.walkAudit) {
    const walkAuditTemplate = path.resolve("./src/templates/walk-audit.tsx");
    const allGatsbyWalkAudit = await graphql<{
      allGatsbyWalkAudit: { nodes: StrapiWalkAudit[] };
    }>(`
      query AllGatsbyWalkAudit {
        allGatsbyWalkAudit {
          nodes {
            title
            slug
            date
            status
            description
            mapUrl
            segments { name }
            summary
          }
        }
      }
    `);

    allGatsbyWalkAudit?.data?.allGatsbyWalkAudit?.nodes
      ?.filter(audit => audit.status === "completed")
      .forEach(audit => {
        createPage({
          path: `/articles/${audit.slug}`,
          component: walkAuditTemplate,
          context: audit,
        });
      });
  }

  // -- Data pages (stoside only) --
  if (siteConfig.build.dataPages) {
    const dataPageTemplate = path.resolve("./src/templates/data-page.tsx");
    const allGatsbyDataPage = await graphql<GatsbyDataPages>(`
      query AllGatsbyDataPage {
        allGatsbyDataPage(sort: { sortOrder: ASC }) {
          nodes {
            title
            description
            slug
            dashboardType
            image {
              childImageSharp {
                gatsbyImageData(
                  width: 1050
                  height: 600
                  layout: CONSTRAINED
                  placeholder: BLURRED
                  formats: [AUTO, WEBP, AVIF]
                  transformOptions: { fit: COVER, cropFocus: CENTER }
                )
              }
            }
            blocks {
              kind
              html
              vizId
              caption
              height
              align
            }
            methodologyHtml
            dataUpdatedAt
            sortOrder
          }
        }
      }
    `);

    allGatsbyDataPage?.data?.allGatsbyDataPage?.nodes?.forEach(dataPage => {
      createPage({
        path: `/data/${dataPage.slug}`,
        component: dataPageTemplate,
        context: dataPage,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Delete site-specific pages that don't belong to current site
// ---------------------------------------------------------------------------

const stosideOnlyPaths = new Set(["/data", "/data/", "/report", "/report/", "/sign-in", "/sign-in/"]);

export function onCreatePage({ page, actions }: Parameters<NonNullable<GatsbyNode["onCreatePage"]>>[0]) {
  if (siteConfig.id !== "stoside" && stosideOnlyPaths.has(page.path)) {
    actions.deletePage(page);
  }
}

// ---------------------------------------------------------------------------
// Schema customization (superset of both sites)
// ---------------------------------------------------------------------------

export function createSchemaCustomization({
  actions: { createTypes },
}: Parameters<NonNullable<GatsbyNode["createSchemaCustomization"]>>[0]) {
  createTypes(`
    type GatsbyArticleBlock {
      kind: String!
      html: String
      vizId: String
      caption: String
      height: Int
      align: String
    }
    type GatsbyArticle implements Node {
      image: File @link(by: "id")
      coverIsFallback: Boolean
      title: String!
      description: String
      slug: String
      blocks: [GatsbyArticleBlock!]!
      authorName: String
      publishedAt: Date @dateformat
    }
    type GatsbyVisualization implements Node {
      vizId: String!
      type: String!
      title: String
      source: String
      data: JSON
      config: JSON
      featuresFile: File @link(by: "name", from: "features")
      featuresTilesFile: File @link(by: "name", from: "featuresTiles")
      featuresTilesUrl: String
      posterFile: File @link(by: "name", from: "posterFrame")
      posterFileMobile: File @link(by: "name", from: "posterFrameMobile")
      basemap: String
      tilesLayer: String
      camera: GatsbyVizCamera
      color: GatsbyVizColor
      elevation: GatsbyVizElevation
      fallback2d: GatsbyVizFallback2d
    }
    type GatsbyVizCamera {
      center: [Float!]!
      zoom: Float
      pitch: Float
      bearing: Float
    }
    type GatsbyVizColor {
      field: String!
      domain: [Float!]!
      range: [String!]!
    }
    type GatsbyVizElevation {
      field: String!
      divisor: Float
    }
    type GatsbyVizFallback2d {
      maxViewportWidth: Int
    }
    type GatsbyEvent implements Node {
      image: File @link(by: "id")
      title: String!
      description: String
      url: String!
      location: String
      startDate: Date! @dateformat
      startDateDisplay: String!
      endDate: Date @dateformat
    }
    type GatsbyDataPage implements Node {
      title: String!
      description: String
      slug: String
      dashboardType: String
      image: File @link(by: "id")
      dataUpdatedAt: Date @dateformat
      sortOrder: Int
    }
    type GatsbySiteSetting implements Node {
      instagramUrl: String
      meetupUrl: String
    }
    type GatsbyWalkAuditSegment {
      name: String!
    }
    type GatsbyDataPage implements Node {
      image: File @link(by: "id")
      title: String!
      description: String
      slug: String!
      dashboardType: String!
      blocks: [GatsbyArticleBlock!]!
      methodologyHtml: String
      dataUpdatedAt: Date @dateformat
      sortOrder: Int
    }
    type GatsbyWalkAudit implements Node {
      title: String!
      slug: String!
      date: Date! @dateformat
      status: String!
      description: String
      mapUrl: String
      segments: [GatsbyWalkAuditSegment!]!
      routeSegments: JSON
      summary: String
    }
  `);
}
