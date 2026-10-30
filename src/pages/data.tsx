import { graphql, useStaticQuery } from "gatsby";
import type { GatsbyDataPage } from "@/types";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import Card from "@/components/Card/card";
import Pagination from "@/components/Pagination/pagination";
import usePagination from "@/hooks/usePagination";

interface DataQuery {
  allGatsbyDataPage: { nodes: GatsbyDataPage[] };
}

const query = graphql`
  query DataListingPage {
    allGatsbyDataPage(sort: { sortOrder: ASC }) {
      nodes {
        title
        description
        slug
        dashboardType
        image {
          childImageSharp {
            gatsbyImageData(
              width: 150
              height: 150
              placeholder: BLURRED
              formats: [AUTO, WEBP, AVIF]
              transformOptions: { fit: COVER, cropFocus: ATTENTION }
            )
          }
        }
        dataUpdatedAt
        sortOrder
      }
    }
  }
`;

export default function Data() {
  const { allGatsbyDataPage } = useStaticQuery<DataQuery>(query);
  const { items, page, totalPages, prev, next } = usePagination(allGatsbyDataPage.nodes);

  return (
    <Layout>
      <Hero title="Data" />
      <Content type="section" ruled>
        {items.map(({ slug, title, description, image, dataUpdatedAt }) => (
          <Card
            key={slug}
            link={`/data/${slug}`}
            title={title}
            description={description || ""}
            image={image}
            publishedAt={dataUpdatedAt}
          />
        ))}
        <Pagination page={page} totalPages={totalPages} onPrev={prev} onNext={next} />
      </Content>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
