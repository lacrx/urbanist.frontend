import { useCallback, useRef } from "react";
import "./dashboard-tokens.module.css";
import * as styles from "./year-range-slider.module.css";
import type { YearRange } from "./types";

type Props = {
  min: number;
  max: number;
  value: YearRange;
  onChange: (range: YearRange) => void;
  sparklineData?: number[];
};

export default function YearRangeSlider({
  min,
  max,
  value,
  onChange,
  sparklineData,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const span = max - min || 1;

  const leftPct = ((value[0] - min) / span) * 100;
  const rightPct = ((value[1] - min) / span) * 100;

  const sparkMax = sparklineData
    ? Math.max(...sparklineData, 1)
    : 1;

  const positionToYear = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + pct * span);
    },
    [min, span],
  );

  const startDrag = useCallback(
    (handle: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const year = positionToYear(ev.clientX);
        if (handle === "start") {
          onChange([Math.min(year, value[1]), value[1]]);
        } else {
          onChange([value[0], Math.max(year, value[0])]);
        }
      };

      const onUp = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    },
    [positionToYear, onChange, value],
  );

  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={styles.container}>
      <div className={styles.labels}>
        <span className={styles.year}>{value[0]}</span>
        <span className={styles.year}>{value[1]}</span>
      </div>
      {sparklineData && (
        <div className={styles.sparkline}>
          {sparklineData.map((v, i) => {
            const year = min + i;
            const inRange = year >= value[0] && year <= value[1];
            return (
              <div
                key={year}
                className={styles.bar}
                style={{
                  height: `${(v / sparkMax) * 100}%`,
                  opacity: inRange ? 1 : 0.25,
                }}
              />
            );
          })}
        </div>
      )}
      <div ref={trackRef} className={styles.track}>
        <div
          className={styles.range}
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <div
          className={styles.handle}
          style={{ left: `${leftPct}%` }}
          role="slider"
          aria-label="Start year"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value[0]}
          tabIndex={0}
          onPointerDown={startDrag("start")}
        />
        <div
          className={styles.handle}
          style={{ left: `${rightPct}%` }}
          role="slider"
          aria-label="End year"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value[1]}
          tabIndex={0}
          onPointerDown={startDrag("end")}
        />
      </div>
      <div className={styles.ticks}>
        {years.map((y) => (
          <span key={y} className={styles.tick}>
            {y}
          </span>
        ))}
      </div>
    </div>
  );
}
