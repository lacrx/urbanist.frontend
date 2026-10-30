export type TractId = string;

export type TractRecord = {
  tractId: TractId;
  name?: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type DashboardData<T extends TractRecord = TractRecord> = {
  tracts: T[];
  citywide: Record<string, string | number>;
  metadata?: {
    dataUpdatedAt?: string;
    source?: string;
    notes?: string;
  };
};

export type LinkedSelection<T extends string | number = string> = {
  selectedUnit: T | null;
  hoveredUnit: T | null;
  onSelect: (unit: T | null) => void;
  onHover: (unit: T | null) => void;
  activeUnit: T | null;
};

export type ColorBreak = {
  value: number;
  color: string;
  label?: string;
};

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
};

export type YearRange = [number, number];
