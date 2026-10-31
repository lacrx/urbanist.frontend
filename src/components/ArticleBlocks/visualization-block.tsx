import { lazy, Suspense } from "react";
import { graphql, useStaticQuery } from "gatsby";
import { SKELETONS } from "@/components/Vis/skeletons";
import * as styles from "./article-blocks.module.css";

const Choropleth3DMaplibre = lazy(() => import("@/components/Vis/choropleth-3d-maplibre"));
const StatTiles = lazy(() => import("@/components/Vis/stat-tiles"));
const Timeline = lazy(() => import("@/components/Vis/timeline"));
const BarChart = lazy(() => import("@/components/Vis/bar-chart"));
const VoteVisualization = lazy(() => import("@/components/Vis/vote-visualization"));
const DataTable = lazy(() => import("@/components/Vis/data-table"));

const RENDERERS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  "choropleth-3d-maplibre": Choropleth3DMaplibre,
  "stat-tiles": StatTiles,
  "timeline": Timeline,
  "bar-chart": BarChart,
  "vote-visualization": VoteVisualization,
  "data-table": DataTable,
};

const NEEDS_STAGE: Record<string, boolean> = {
  "choropleth-3d-maplibre": true,
};

type VisualizationBlockProps = {
  vizId: string;
  caption?: string | null;
  height: number;
  align: string;
};

export type GatsbyVisualization = {
  vizId: string;
  type: string;
  title: string | null;
  source: string | null;
  data: unknown;
  config: unknown;
  featuresFile: { publicURL: string | null } | null;
  featuresTilesFile: { publicURL: string | null } | null;
  featuresTilesUrl: string | null;
  basemap: string | null;
  posterFile: { publicURL: string | null } | null;
  posterFileMobile: { publicURL: string | null } | null;
  tilesLayer: string | null;
  camera: { center: number[]; zoom: number | null; pitch: number | null; bearing: number | null } | null;
  color: { field: string; domain: number[]; range: string[] } | null;
  elevation: { field: string; divisor: number | null } | null;
  fallback2d: { maxViewportWidth: number | null } | null;
};

type Query = {
  allGatsbyVisualization: { nodes: GatsbyVisualization[] };
};

export default function VisualizationBlock({ vizId, caption, height, align }: VisualizationBlockProps) {
  const { allGatsbyVisualization } = useStaticQuery<Query>(graphql`
    query AllGatsbyVisualization {
      allGatsbyVisualization {
        nodes {
          vizId
          type
          title
          source
          data
          config
          featuresFile { publicURL }
          featuresTilesFile { publicURL }
          featuresTilesUrl
          basemap
          posterFile { publicURL }
          posterFileMobile { publicURL }
          tilesLayer
          camera { center zoom pitch bearing }
          color { field domain range }
          elevation { field divisor }
          fallback2d { maxViewportWidth }
        }
      }
    }
  `);

  const artifact = allGatsbyVisualization.nodes.find(v => v.vizId === vizId);
  const alignClass =
    align === "full-bleed" ? styles.fullBleed : align === "wide" ? styles.wide : styles.inline;

  if (!artifact) {
    return (
      <figure className={`${styles.vizFigure} ${alignClass}`}>
        <div className={styles.vizMissing}>Missing visualization: <code>{vizId}</code></div>
      </figure>
    );
  }

  const normalizedType = artifact.type.replace(/_/g, "-");
  const Renderer = RENDERERS[normalizedType];
  if (!Renderer) {
    return (
      <figure className={`${styles.vizFigure} ${alignClass}`}>
        <div className={styles.vizMissing}>
          No renderer registered for type <code>{normalizedType}</code> (viz <code>{vizId}</code>)
        </div>
      </figure>
    );
  }

  if (NEEDS_STAGE[normalizedType]) {
    const posterUrl = artifact.posterFile?.publicURL ?? null;
    const posterUrlMobile = artifact.posterFileMobile?.publicURL ?? null;

    return (
      <figure className={`${styles.vizFigure} ${alignClass}`}>
        <div className={styles.vizStage} style={{ height }}>
          {posterUrl && (
            <picture className={styles.vizPoster}>
              {posterUrlMobile && (
                <source media="(max-width: 768px)" srcSet={posterUrlMobile} />
              )}
              <img
                src={posterUrl}
                alt={artifact.title ?? artifact.vizId}
                className={styles.vizPoster}
                loading="lazy"
                decoding="async"
              />
            </picture>
          )}
          <Suspense fallback={<div className={styles.vizPosterFill} />}>
            <Renderer artifact={artifact} height={height} />
          </Suspense>
          <div className={styles.vizLoader} aria-hidden="true">
            <span>&bull;</span><span>&bull;</span><span>&bull;</span>
          </div>
        </div>
        {(caption || artifact.source) && (
          <figcaption className={styles.vizCaption}>
            {caption && <span>{caption}</span>}
            {caption && artifact.source && <span> &middot; </span>}
            {artifact.source && <span>Source: {artifact.source}</span>}
          </figcaption>
        )}
      </figure>
    );
  }

  const Skeleton = SKELETONS[normalizedType];
  const hasSkeleton = !!Skeleton;

  return (
    <figure className={`${styles.vizFigure} ${alignClass}`}>
      <div className={styles.vizStageContent}>
        {Skeleton && (
          <div className={styles.vizSkeleton}>
            <Skeleton artifact={artifact} height={height} />
          </div>
        )}
        <Suspense fallback={hasSkeleton ? null : <div style={{ height }} />}>
          <Renderer artifact={artifact} height={height} />
        </Suspense>
      </div>
      {(caption || artifact.source) && (
        <figcaption className={styles.vizCaption}>
          {caption && <span>{caption}</span>}
          {caption && artifact.source && <span> &middot; </span>}
          {artifact.source && <span>Source: {artifact.source}</span>}
        </figcaption>
      )}
    </figure>
  );
}
