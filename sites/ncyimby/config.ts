import type { SiteConfig } from "../../src/site-config";

const config: SiteConfig = {
  id: "ncyimby",
  title: "North Coastal YIMBY Dems SD",
  shortName: "NC YIMBY",

  hero: {
    title: "Building housing for all of North County",
    description: "We're North Coastal YIMBY Dems SD, organizing for abundant housing, smart growth, and livable communities across San Diego's North Coast.",
    cta: "Join us.",
    ctaSource: "meetup",
  },

  navLinks: [
    { label: "Articles", path: "/articles" },
    { label: "Events", path: "/events" },
    { label: "About", path: "/about" },
  ],
  logo: null,
  auth: false,

  newsletter: {
    cta: "Stay in the loop on housing in North County.",
  },

  about: {
    heroProps: { style: { paddingBottom: "1.5rem" } },
    contentProps: {},
  },

  build: {
    eventSource: "strapi",
    articleSort: true,
    vizBlockNested: true,
    coverFallbacks: {},
    substackSrcset: false,
    walkAudit: false,
    dataPages: false,
    pagination: { pageSize: 100 },
  },
};

export default config;
