import * as styles from "./section-heading.module.css";

type Props = {
  title: string;
  subtitle?: string;
};

export default function SectionHeading({ title, subtitle }: Props) {
  return (
    <div className={styles.section}>
      <h3 className={styles.title}>{title}</h3>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
