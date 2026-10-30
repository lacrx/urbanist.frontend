import { graphql, useStaticQuery } from "gatsby";
import type { GatsbyEvent } from "@/types";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import EventList from "@/components/EventList/eventList";
import Pagination from "@/components/Pagination/pagination";
import usePagination from "@/hooks/usePagination";

const query = graphql`
  query UpcomingEvents {
    allGatsbyEvent(sort: { startDate: ASC }) {
      nodes {
        id
        title
        description
        url
        location
        startDate
        startDateDisplay
        image {
          childImageSharp {
            gatsbyImageData(
              width: 150
              height: 150
              placeholder: BLURRED
              formats: [AUTO, WEBP, AVIF]
              transformOptions: { fit: COVER, cropFocus: CENTER }
            )
          }
        }
      }
    }
  }
`;

export default function Events() {
  const { allGatsbyEvent: { nodes } } = useStaticQuery<{ allGatsbyEvent: { nodes: GatsbyEvent[] } }>(query);
  const { items, page, totalPages, prev, next } = usePagination(nodes);
  return (
    <Layout>
      <Hero title="Upcoming events" />
      <Content type="section" ruled>
        <EventList events={items} />
        <Pagination page={page} totalPages={totalPages} onPrev={prev} onNext={next} />
      </Content>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
