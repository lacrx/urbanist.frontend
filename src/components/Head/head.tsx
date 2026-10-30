import { graphql, useStaticQuery } from "gatsby";

const siteTitleQuery = graphql`
  query SiteTitleQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`;

type HeadProps = {
  subheading?: string;
  bodyClass?: string;
};

export function Head({ subheading, bodyClass }: HeadProps) {
  const { site: { siteMetadata: { title } } } = useStaticQuery(siteTitleQuery);
  const text = (subheading ? subheading + " | " : "") + title;
  return (
    <>
      <title>{text}</title>
      <meta name="description" content={text} />
      <link rel="icon" href="/favicon.png" />
      {bodyClass && <body className={bodyClass} />}
    </>
  );
}
