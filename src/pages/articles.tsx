import { graphql, useStaticQuery } from "gatsby";
import type { GatsbyArticle } from "@/types";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import Card from "@/components/Card/card";
import Pagination from "@/components/Pagination/pagination";
import usePagination from "@/hooks/usePagination";

const query = graphql`
  query AllGatsbyArticle {
    allGatsbyArticle(sort: { publishedAt: DESC }) {
      nodes {
        title
        description
        slug
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
        authorName
        publishedAt
      }
    }
  }
`;

export default function Articles() {
  const { allGatsbyArticle: { nodes } } = useStaticQuery<{ allGatsbyArticle: { nodes: GatsbyArticle[] } }>(query);
  const { items, page, totalPages, prev, next } = usePagination(nodes);
  return (
    <Layout>
      <Hero title="We've put pen to paper" />
      <Content type="section" ruled>
        {items.map(({ slug, title, description, image, authorName, publishedAt }) => (
          <Card
            key={slug}
            link={`/articles/${slug}`}
            title={title}
            description={description}
            image={image}
            authorName={authorName}
            publishedAt={publishedAt}
          />
        ))}
        <Pagination page={page} totalPages={totalPages} onPrev={prev} onNext={next} />
      </Content>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
