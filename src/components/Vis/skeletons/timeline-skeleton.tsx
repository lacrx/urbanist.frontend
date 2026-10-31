import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./skeletons.module.css";

type TimelineData = {
  entries: Array<{ date: string; title: string; body?: string; highlight?: boolean }>;
};

type Props = { artifact: GatsbyVisualization };

export default function TimelineSkeleton({ artifact }: Props) {
  const { entries } = (artifact.data ?? { entries: [] }) as TimelineData;

  return (
    <ol className={styles.timelineList}>
      {entries.map((entry, i) => (
        <li key={i} className={styles.timelineEntry}>
          <div className={styles.timelineDate}>{entry.date}</div>
          <div className={styles.timelineTitle}>{entry.title}</div>
          {entry.body && <div className={styles.timelineBody} />}
        </li>
      ))}
    </ol>
  );
}
