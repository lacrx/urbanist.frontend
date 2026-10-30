declare module "@/site/config" {
  import type { SiteConfig } from "@/site-config";
  const config: SiteConfig;
  export default config;
}

declare module "@/site/about-content" {
  const AboutContent: () => JSX.Element;
  export default AboutContent;
}

declare module "@/site/theme.css" {}

declare module "@/site/images/*.svg" {
  const url: string;
  export default url;
}
