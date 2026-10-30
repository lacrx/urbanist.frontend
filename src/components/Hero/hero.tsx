import type { CSSProperties } from "react";
import { graphql, useStaticQuery } from "gatsby";
import { hero, centered as centeredCls } from './hero.module.css';
import config from "@/site/config";

type HeroProps = {
  title: string;
  cta?: string;
  description?: string;
  showBuddy?: boolean;
  centered?: boolean;
  style?: CSSProperties;
};

type SiteSettingQuery = {
  allGatsbySiteSetting: {
    nodes: Array<{
      meetupUrl: string | null
      instagramUrl: string | null
    }>
  }
};

const siteSettingQuery = graphql`
  query HeroSiteSetting {
    allGatsbySiteSetting {
      nodes {
        meetupUrl
        instagramUrl
      }
    }
  }
`;

const buddyStyle: CSSProperties = { position: "absolute", bottom: "-6px", right: "-5px", zIndex: 2 };

export default function Hero({ title, cta, description, showBuddy = false, centered = false, style }: HeroProps) {
  const { allGatsbySiteSetting } = useStaticQuery<SiteSettingQuery>(siteSettingQuery);
  const settings = allGatsbySiteSetting.nodes[0];

  let ctaUrl = "#";
  if (config.hero.ctaSource === "meetup") {
    ctaUrl = settings?.meetupUrl || "#";
  } else if (config.hero.ctaSource === "discord") {
    ctaUrl = config.hero.discordUrl || "#";
  }

  const instagramUrl = settings?.instagramUrl || config.hero.defaultInstagramUrl || "#";

  return (
    <header className={`${hero}${centered ? ` ${centeredCls}` : ''}`} style={style}>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {cta && (
        <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
          <p>{cta}</p>
        </a>
      )}
      {showBuddy && config.hero.buddyImage && (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" style={buddyStyle}>
          <img
            src={require(`@/site/images/${config.hero.buddyImage}`).default}
            width="60"
            height="60"
            alt={config.hero.buddyAlt || ""}
          />
        </a>
      )}
    </header>
  );
}
