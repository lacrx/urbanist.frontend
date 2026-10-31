import type { GatsbyVisualization } from "@/components/ArticleBlocks/visualization-block";
import * as styles from "./skeletons.module.css";

type VoteData = {
  votes: Array<{ name: string; vote: string; title?: string }>;
  result?: string;
};

type VoteConfig = {
  yesColor?: string;
  noColor?: string;
  abstainColor?: string;
  title?: string;
};

const DEFAULT_COLORS: Record<string, string> = {
  yes: "#2d8a4e", no: "#c0392b", abstain: "#7f8c8d", absent: "#bbb",
};

const GROUP_ORDER = ["yes", "no", "abstain", "absent"];
const GROUP_LABELS: Record<string, string> = { yes: "Yes", no: "No", abstain: "Abstain", absent: "Absent" };

type Props = { artifact: GatsbyVisualization };

export default function VoteSkeleton({ artifact }: Props) {
  const { votes, result } = (artifact.data ?? { votes: [] }) as VoteData;
  const cfg = (artifact.config ?? {}) as VoteConfig;

  const colors: Record<string, string> = {
    yes: cfg.yesColor ?? DEFAULT_COLORS.yes,
    no: cfg.noColor ?? DEFAULT_COLORS.no,
    abstain: cfg.abstainColor ?? DEFAULT_COLORS.abstain,
    absent: DEFAULT_COLORS.absent,
  };

  const groups: Record<string, typeof votes> = {};
  for (const v of votes) (groups[v.vote] ??= []).push(v);

  return (
    <div className={styles.voteContainer}>
      {cfg.title && <div className={styles.voteTitle}>{cfg.title}</div>}
      <div className={styles.voteGroups}>
        {GROUP_ORDER.map(key => {
          const members = groups[key];
          if (!members?.length) return null;
          return (
            <div key={key} className={styles.voteGroup}>
              <span className={styles.voteGroupLabel} style={{ color: colors[key] }}>
                {GROUP_LABELS[key]} ({members.length})
              </span>
              <div className={styles.votePills}>
                {members.map((m, i) => (
                  <span key={i} className={styles.votePill} style={{ background: colors[key] }}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {result && <div className={styles.voteResult}>{result}</div>}
    </div>
  );
}
