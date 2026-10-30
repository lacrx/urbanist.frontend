import "./dashboard-tokens.module.css";
import * as styles from "./filter-toggle-group.module.css";
import type { FilterOption } from "./types";

type Props<T extends string = string> = {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
};

export default function FilterToggleGroup<T extends string = string>({
  options,
  value,
  onChange,
  label,
}: Props<T>) {
  return (
    <fieldset className={styles.fieldset}>
      {label && <legend className={styles.legend}>{label}</legend>}
      <div className={styles.group} role="radiogroup">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={opt.value === value}
            className={`${styles.toggle} ${opt.value === value ? styles.active : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
