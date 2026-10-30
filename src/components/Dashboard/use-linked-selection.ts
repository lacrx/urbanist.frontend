import { useState, useCallback, useMemo } from "react";
import type { LinkedSelection } from "./types";

export function useLinkedSelection<
  T extends string | number = string,
>(): LinkedSelection<T> {
  const [selectedUnit, setSelectedUnit] = useState<T | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<T | null>(null);

  const onSelect = useCallback(
    (unit: T | null) => setSelectedUnit((prev) => (prev === unit ? null : unit)),
    [],
  );

  const onHover = useCallback((unit: T | null) => setHoveredUnit(unit), []);

  const activeUnit = hoveredUnit ?? selectedUnit;

  return useMemo(
    () => ({ selectedUnit, hoveredUnit, onSelect, onHover, activeUnit }),
    [selectedUnit, hoveredUnit, onSelect, onHover, activeUnit],
  );
}
