import "./dashboard-tokens.module.css";
import * as styles from "./map-legend.module.css";
import type { ColorBreak } from "./types";

type SequentialProps = {
  variant: "sequential";
  breaks: ColorBreak[];
  title?: string;
};

type DivergingProps = {
  variant: "diverging";
  negativeLabel: string;
  positiveLabel: string;
  negativeColor: string;
  positiveColor: string;
  neutralColor: string;
  title?: string;
};

type Props = SequentialProps | DivergingProps;

export default function MapLegend(props: Props) {
  if (props.variant === "diverging") {
    return (
      <div className={styles.legend}>
        {props.title && <div className={styles.title}>{props.title}</div>}
        <div className={styles.divergingBar}>
          <div
            className={styles.divergingHalf}
            style={{ background: `linear-gradient(to right, ${props.negativeColor}, ${props.neutralColor})` }}
          />
          <div
            className={styles.divergingHalf}
            style={{ background: `linear-gradient(to right, ${props.neutralColor}, ${props.positiveColor})` }}
          />
        </div>
        <div className={styles.divergingLabels}>
          <span>{props.negativeLabel}</span>
          <span>0</span>
          <span>{props.positiveLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.legend}>
      {props.title && <div className={styles.title}>{props.title}</div>}
      <div className={styles.swatches}>
        {props.breaks.map((b, i) => (
          <div key={i} className={styles.swatch}>
            <div
              className={styles.color}
              style={{ background: b.color }}
            />
            <span className={styles.label}>{b.label ?? b.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
