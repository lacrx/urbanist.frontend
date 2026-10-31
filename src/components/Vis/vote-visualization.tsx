import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./vote-visualization.module.css";

type VoteVisualizationData = {
  votes: Array<{
    name: string;
    vote: "yes" | "no" | "abstain" | "absent";
    title?: string;
  }>;
  result?: string;
};

type VoteVisualizationConfig = {
  yesColor?: string;
  noColor?: string;
  abstainColor?: string;
  title?: string;
};

const DEFAULT_COLORS = { yes: "#2d8a4e", no: "#c0392b", abstain: "#7f8c8d", absent: "#bbb" };

type Props = { artifact: GatsbyVisualization };

export default function VoteVisualization({ artifact }: Props) {
  const { votes, result } = (artifact.data ?? { votes: [] }) as VoteVisualizationData;
  const cfg = (artifact.config ?? {}) as VoteVisualizationConfig;

  const colors = {
    yes: cfg.yesColor ?? DEFAULT_COLORS.yes,
    no: cfg.noColor ?? DEFAULT_COLORS.no,
    abstain: cfg.abstainColor ?? DEFAULT_COLORS.abstain,
    absent: DEFAULT_COLORS.absent,
  };

  const groups: Record<string, typeof votes> = {};
  for (const v of votes) {
    (groups[v.vote] ??= []).push(v);
  }

  const groupOrder = ["yes", "no", "abstain", "absent"] as const;
  const groupLabels: Record<string, string> = { yes: "Yes", no: "No", abstain: "Abstain", absent: "Absent" };

  return (
    <div className={styles.container} data-viz-ready="true">
      {cfg.title && <div className={styles.voteTitle}>{cfg.title}</div>}
      <div className={styles.groups} role="list" aria-label="Vote breakdown">
        {groupOrder.map(key => {
          const members = groups[key];
          if (!members?.length) return null;
          return (
            <div key={key} className={styles.group} role="listitem">
              <span className={styles.groupLabel} style={{ color: colors[key] }}>
                {groupLabels[key]} ({members.length})
              </span>
              <div className={styles.pills}>
                {members.map((m, i) => (
                  <span key={i} className={styles.pill} style={{ background: colors[key] }}>
                    {m.name}
                    {m.title && <span className={styles.pillTitle}>{m.title}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {result && <div className={styles.result}>{result}</div>}
    </div>
  );
}
