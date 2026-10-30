import { type PageProps } from "gatsby";
import { Head as _Head } from "@/components/Head/head";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import { results, routeLink } from "@/components/WalkAudit/walk-audit.module.css";

type Segment = { name: string };

type WalkAuditContext = {
  title: string;
  slug: string;
  date: string;
  description: string | null;
  mapUrl: string | null;
  segments: Segment[];
  summary: string | null;
};

interface WalkAuditPageProps extends PageProps {
  pageContext: WalkAuditContext;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function WalkAudit({ pageContext }: WalkAuditPageProps) {
  const { title, date, description, mapUrl, segments, summary } = pageContext;

  return (
    <Layout>
      <Hero
        title={`Walk Audit: ${title}`}
        description={`${formatDate(date)}${description ? ` · ${description}` : ""}`}
      />
      <Content type="section" ruled>
        <div className={results}>
          {mapUrl && (
            <p>
              <a className={routeLink} href={mapUrl} target="_blank" rel="noopener noreferrer">
                &#x1f5fa;&#xfe0f; View route map
              </a>
            </p>
          )}
          {segments.length > 0 && (
            <p>{segments.length} segment{segments.length === 1 ? "" : "s"}: {segments.map(s => s.name).join(", ")}</p>
          )}
          {summary ? (
            <div dangerouslySetInnerHTML={{ __html: summary }} />
          ) : (
            <p>Summary coming soon.</p>
          )}
        </div>
      </Content>
    </Layout>
  );
}

export const Head = ({ pageContext: { title } }: WalkAuditPageProps) =>
  _Head({ subheading: `Walk Audit: ${title}` });
