import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./timeline.module.css";

type TimelineData = {
  entries: Array<{
    date: string;
    title: string;
    body?: string;
    highlight?: boolean;
  }>;
};

type Props = { artifact: GatsbyVisualization };

export default function Timeline({ artifact }: Props) {
  const { entries } = (artifact.data ?? { entries: [] }) as TimelineData;

  return (
    <ol className={styles.timeline}>
      {entries.map((entry, i) => (
        <li key={i} className={`${styles.entry}${entry.highlight ? ` ${styles.highlight}` : ""}`}>
          <div className={styles.date}>{entry.date}</div>
          <div className={styles.title}>{entry.title}</div>
          {entry.body && <p className={styles.body}>{entry.body}</p>}
        </li>
      ))}
    </ol>
  );
}
