export type TargetCloud = "Azure" | "AWS";

export interface GlobalSettings {
  targetCloud: TargetCloud;
  growthPercent: number;
  growthYears: number;
  limitCalculationYears: number | null;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  targetCloud: "Azure",
  growthPercent: 0,
  growthYears: 0,
  limitCalculationYears: null,
};
