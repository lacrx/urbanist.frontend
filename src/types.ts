import { IGatsbyImageData } from "gatsby-plugin-image";

export type GatsbyArticle = {
  title: string;
  description: string;
  slug: string;
  image: IGatsbyImageData | null;
  authorName: string | null;
  publishedAt: string | null;
};

export type GatsbyEvent = {
  id: string;
  title: string;
  description: string;
  url: string;
  location: string;
  startDate: string;
  startDateDisplay: string;
  image: { childImageSharp: { gatsbyImageData: IGatsbyImageData } } | null;
};

export type GatsbyWalkAudit = {
  title: string;
  slug: string;
  date: string;
  description: string | null;
};

export type GatsbyDataPage = {
  title: string;
  description: string | null;
  slug: string;
  dashboardType: string;
  image: IGatsbyImageData | null;
  dataUpdatedAt: string | null;
  sortOrder: number;
};
