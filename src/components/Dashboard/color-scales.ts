import type { ColorBreak } from "./types";

export function sequentialScale(
  breaks: ColorBreak[],
): (value: number) => string {
  return (value) => {
    for (let i = breaks.length - 1; i >= 0; i--) {
      if (value >= breaks[i].value) return breaks[i].color;
    }
    return breaks[0].color;
  };
}

export function geometricBreaks(
  min: number,
  max: number,
  steps: number,
): number[] {
  if (min <= 0) min = 1;
  const ratio = Math.pow(max / min, 1 / steps);
  const breaks: number[] = [];
  for (let i = 1; i < steps; i++) {
    breaks.push(Math.round(min * Math.pow(ratio, i)));
  }
  return breaks;
}

export function divergingScale(
  negativeColor: string,
  neutralColor: string,
  positiveColor: string,
): (value: number, maxAbs: number) => string {
  return (value, maxAbs) => {
    if (maxAbs === 0) return neutralColor;
    const t = Math.abs(value) / maxAbs;
    const opacity = Math.round(t * 255)
      .toString(16)
      .padStart(2, "0");
    if (value > 0) return positiveColor + opacity;
    if (value < 0) return negativeColor + opacity;
    return neutralColor;
  };
}

export function buildMapLibreStepExpression(
  field: string,
  breaks: ColorBreak[],
): unknown[] {
  const expr: unknown[] = ["step", ["get", field], breaks[0].color];
  for (let i = 1; i < breaks.length; i++) {
    expr.push(breaks[i].value, breaks[i].color);
  }
  return expr;
}

export const SEQUENTIAL_BLUES: ColorBreak[] = [
  { value: 0, color: "#eff6ff", label: "0" },
  { value: 5, color: "#bfdbfe", label: "5" },
  { value: 15, color: "#93c5fd", label: "15" },
  { value: 30, color: "#60a5fa", label: "30" },
  { value: 50, color: "#3b82f6", label: "50" },
  { value: 100, color: "#2563eb", label: "100" },
  { value: 200, color: "#1d4ed8", label: "200+" },
];

export const DIVERGING = {
  positive: "#2563eb",
  negative: "#dc2626",
  neutral: "#9ca3af",
};
