import { lazy, Suspense } from "react";
import { GatsbyImage, getImage, IGatsbyImageData } from "gatsby-plugin-image";
import { type PageProps } from "gatsby";
import { Head as _Head } from "@/components/Head/head";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import ArticleBlocks, { type ArticleBlock } from "@/components/ArticleBlocks/article-blocks";
import { cover } from "@/components/ArticleBlocks/article-blocks.module.css";

const DASHBOARDS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "permitted-units": lazy(() => import("@/components/Dashboard/PermittedUnitsDashboard")),
  "permitted_units": lazy(() => import("@/components/Dashboard/PermittedUnitsDashboard")),
  "affordable-units": lazy(() => import("@/components/Dashboard/AffordableUnitsDashboard")),
  "affordable_units": lazy(() => import("@/components/Dashboard/AffordableUnitsDashboard")),
  "affordability-map": lazy(() => import("@/components/Dashboard/AffordabilityDashboard")),
  "affordability_map": lazy(() => import("@/components/Dashboard/AffordabilityDashboard")),
};

type DataPageContext = {
  title: string;
  description: string | null;
  slug: string;
  dashboardType: string;
  image: IGatsbyImageData | null;
  blocks: ArticleBlock[];
  methodologyHtml: string | null;
  dataUpdatedAt: string | null;
};

interface DataPageProps extends PageProps {
  pageContext: DataPageContext;
}

export default function DataPage({ pageContext: { title, description, dashboardType, image, blocks, methodologyHtml, dataUpdatedAt } }: DataPageProps) {
  const img = image ? getImage(image) : null;
  const Dashboard = DASHBOARDS[dashboardType];

  return (
    <Layout>
      <Hero title={title} description={description || undefined} style={{ paddingBottom: 0 }} />
      <Content type="section">
        {img && <GatsbyImage image={img} alt={title} className={cover} />}
        <ArticleBlocks blocks={blocks} />
        {Dashboard ? (
          <Suspense fallback={<div style={{ padding: "3rem 0", textAlign: "center", color: "var(--light-grey)" }}>Loading dashboard...</div>}>
            <Dashboard />
          </Suspense>
        ) : (
          <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--light-grey)" }}>
            Dashboard type "{dashboardType}" not yet implemented.
          </div>
        )}
        {dataUpdatedAt && (
          <p style={{ fontSize: "0.82rem", color: "var(--light-grey)", margin: "1.5rem 0 0" }}>
            Data last updated: {new Date(dataUpdatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
        {methodologyHtml && (
          <Content type="section" ruled>
            <div dangerouslySetInnerHTML={{ __html: methodologyHtml }} />
          </Content>
        )}
      </Content>
    </Layout>
  );
}

export const Head = ({ pageContext: { title } }: DataPageProps) =>
  _Head({ subheading: title, bodyClass: "article" });
