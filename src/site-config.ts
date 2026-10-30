export type NavLink = {
  label: string;
  path: string;
};

export type SiteConfig = {
  id: string;
  title: string;
  shortName: string;

  hero: {
    title: string;
    description: string;
    cta: string;
    ctaSource: "meetup" | "discord";
    discordUrl?: string;
    showBuddy?: boolean;
    buddyImage?: string;
    buddyAlt?: string;
    defaultInstagramUrl?: string;
  };

  navLinks: NavLink[];
  logo: string | null;
  auth: boolean;

  newsletter: {
    cta: string;
    actionUrl?: string;
    listId?: string;
  };

  about: {
    heroProps: Record<string, unknown>;
    contentProps: Record<string, unknown>;
  };

  build: {
    eventSource: "strapi" | "meetup";
    meetupGroupUrl?: string;
    articleSort: boolean;
    vizBlockNested: boolean;
    coverFallbacks: Record<string, string>;
    substackSrcset: boolean;
    walkAudit: boolean;
    dataPages: boolean;
    pagination: { pageSize?: number };
  };
};
