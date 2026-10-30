import { graphql, useStaticQuery } from "gatsby";
import type { GatsbyDataPage } from "@/types";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import Card from "@/components/Card/card";

interface DataQuery {
  allGatsbyDataPage: { nodes: GatsbyDataPage[] };
}

const query = graphql`
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

  return (
    <Layout>
      <Hero title="Data" />
      <Content type="section" ruled>
        {allGatsbyDataPage.nodes.map(({ slug, title, description, image, dataUpdatedAt }) => (
          <Card
            key={slug}
            link={`/data/${slug}`}
            title={title}
            description={description || ""}
            image={image}
            publishedAt={dataUpdatedAt}
          />
        ))}
      </Content>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
