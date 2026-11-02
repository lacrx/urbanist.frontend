import { lazy, Suspense, useState, useEffect } from "react";
import { SKELETONS } from "@/components/Vis/skeletons";
import VizPlaceholder from "@/components/Vis/VizPlaceholder";
import type { Visualization } from "@/lib/strapi";
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

function useInteractionSignal(timeoutMs = 15000) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    const activate = () => setReady(true);
    const events = ["scroll", "mousemove", "keydown", "touchstart", "pointerdown"] as const;
    for (const e of events) window.addEventListener(e, activate, { once: true, passive: true });
    const timer = setTimeout(activate, timeoutMs);
    return () => {
      for (const e of events) window.removeEventListener(e, activate);
      clearTimeout(timer);
    };
  }, [ready, timeoutMs]);
  return ready;
}

function StagedViz({
  artifact,
  vizId,
  caption,
  height,
  alignClass,
  Renderer,
}: {
  artifact: Visualization & Record<string, any>;
  vizId: string;
  caption?: string | null;
  height: number;
  alignClass: string;
  Renderer: React.LazyExoticComponent<React.ComponentType<any>>;
}) {
  const ready = useInteractionSignal();
  const posterUrl = artifact.posterFile?.publicURL ?? artifact.posterFrame ?? null;
  const posterUrlMobile = artifact.posterFileMobile?.publicURL ?? artifact.posterFrameMobile ?? null;

  return (
    <figure className={`${styles.vizFigure} ${alignClass}`} data-viz-id={vizId}>
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
        {ready ? (
          <Suspense fallback={<div className={styles.vizPosterFill} />}>
            <Renderer artifact={artifact} height={height} />
          </Suspense>
        ) : (
          <div className={styles.vizActivateOverlay}>
            <div className={styles.vizLoader} aria-hidden="true">
              <span>&bull;</span><span>&bull;</span><span>&bull;</span>
            </div>
          </div>
        )}
        {ready && (
          <div className={styles.vizLoader} aria-hidden="true">
            <span>&bull;</span><span>&bull;</span><span>&bull;</span>
          </div>
        )}
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

type VisualizationBlockProps = {
  vizId: string;
  caption?: string | null;
  height: number;
  align: string;
  visualizations?: Visualization[];
};

export default function VisualizationBlock({ vizId, caption, height, align, visualizations = [] }: VisualizationBlockProps) {
  const artifact = visualizations.find(v => v.vizId === vizId) as (Visualization & Record<string, any>) | undefined;
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
    return (
      <StagedViz
        artifact={artifact}
        vizId={vizId}
        caption={caption}
        height={height}
        alignClass={alignClass}
        Renderer={Renderer}
      />
    );
  }

  const Skeleton = SKELETONS[normalizedType];

  const fallbackContent = Skeleton
    ? <Skeleton artifact={artifact} height={height} />
    : <div style={{ height }} />;

  return (
    <figure className={`${styles.vizFigure} ${alignClass}`} data-viz-id={vizId}>
      <div className={styles.vizStageContent}>
        <div className={styles.vizSkeleton}>
          <VizPlaceholder vizId={vizId} height={height}>
            {fallbackContent}
          </VizPlaceholder>
        </div>
        <Suspense fallback={null}>
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
