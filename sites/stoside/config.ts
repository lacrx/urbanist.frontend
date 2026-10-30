import type { SiteConfig } from "../../src/site-config";

const config: SiteConfig = {
  id: "stoside",
  title: "Strong Towns Oceanside",
  shortName: "STRONG TOWNS",

  hero: {
    title: "Building resilience, one step at a time",
    description: "We're a scrappy group of Oceansiders doing the next-smallest thing today to make Oceanside better.",
    cta: "Be our neighbor",
    ctaSource: "discord",
    discordUrl: "https://discord.com/invite/sraXTxwC3P",
    showBuddy: true,
    buddyImage: "pelican.png",
    buddyAlt: "Strong Towns Oceanside Instagram",
    defaultInstagramUrl: "https://www.instagram.com/strongtowns.oceanside/",
  },

  navLinks: [
    { label: "Articles", path: "/articles" },
    { label: "Data", path: "/data" },
    { label: "Events", path: "/events" },
    { label: "Report", path: "/report" },
    { label: "About", path: "/about" },
  ],
  logo: "/stoside-logo.svg",
  auth: true,

  newsletter: {
    cta: "Stay in the loop on what's happening in Oceanside.",
    actionUrl: "https://uz6kxsrese.execute-api.us-east-1.amazonaws.com/subscribe",
    listId: "stoside",
  },

  about: {
    heroProps: {},
    contentProps: { ruled: true },
  },

  build: {
    eventSource: "meetup",
    meetupGroupUrl: "north-county-urbanists",
    articleSort: false,
    vizBlockNested: false,
    coverFallbacks: {
      "our-wealth-is-downtown": "oceanside-wealth-poster-desktop.jpg",
      "san-clemente-wealth-is-downtown": "san-clemente-wealth-poster-desktop.jpg",
    },
    substackSrcset: true,
    walkAudit: true,
    dataPages: true,
    pagination: {},
  },
};

export default config;
