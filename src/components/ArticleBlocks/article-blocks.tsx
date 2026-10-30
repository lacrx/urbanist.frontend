import { Fragment } from "react";
import VisualizationBlock from "./visualization-block";
import { richText } from "./article-blocks.module.css";

export type ArticleBlock = {
  kind: "rich-text" | "visualization";
  html?: string | null;
  vizId?: string | null;
  caption?: string | null;
  height?: number | null;
  align?: string | null;
};

type ArticleBlocksProps = {
  blocks: ArticleBlock[];
};

export default function ArticleBlocks({ blocks }: ArticleBlocksProps) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === "rich-text" && block.html) {
          return (
            <div
              key={i}
              className={richText}
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          );
        }
        if (block.kind === "visualization" && block.vizId) {
          return (
            <VisualizationBlock
              key={i}
              vizId={block.vizId}
              caption={block.caption}
              height={block.height ?? 520}
              align={block.align ?? "inline"}
            />
          );
        }
        return <Fragment key={i} />;
      })}
    </>
  );
}
