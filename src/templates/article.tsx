import { GatsbyImage, getImage, IGatsbyImageData } from "gatsby-plugin-image";
import { type PageProps } from "gatsby";
import { Head as _Head } from "@/components/Head/head";
import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import ArticleBlocks, { type ArticleBlock } from "@/components/ArticleBlocks/article-blocks";
import Byline from "@/components/Byline/byline";
import { cover } from "@/components/ArticleBlocks/article-blocks.module.css";

type GatsbyArticle = {
  title: string
  description: string
  slug: string
  image: IGatsbyImageData
  blocks: ArticleBlock[]
  authorName: string | null
  publishedAt: string | Date | null
};
interface ArticlePageProps extends PageProps {
  pageContext: GatsbyArticle
}

const contentProps = {
  type: "section"
}

export default function Article({ pageContext: { title, description, image, blocks, authorName, publishedAt }}: ArticlePageProps) {
  const heroProps = {
    title,
    description,
    style: { paddingBottom: 0 },
  }

  const img = getImage(image);

  return (
    <Layout>
      <Hero { ...heroProps } />
      <Content { ...contentProps } >
        <Byline author={authorName} publishedAt={publishedAt} />
        {img && blocks[0]?.kind !== "visualization" && <GatsbyImage image={img} alt={title} className={cover} />}
        <ArticleBlocks blocks={blocks} />
      </Content>
    </Layout>
  );
}

export const Head = ({ pageContext: { title } }: ArticlePageProps) =>
  _Head({ subheading: title, bodyClass: "article" });
