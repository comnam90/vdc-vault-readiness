export type TargetCloud = "Azure" | "AWS";

export interface GlobalSettings {
  targetCloud: TargetCloud;
  growthPercent: number;
  growthYears: number;
  limitCalculationYears: number | null;
  ignoreArchiveTier: boolean;
  /**
   * When true, the multi-year growth projection treats the environment as
   * greenfield: at year K it models K years of GFS chain buildup AND K years
   * of source-data growth. When false (default), the projection treats the
   * environment as seeded — the GFS chain is at full retention from day 1
   * and only source-data growth varies year over year.
   */
  greenfieldSimulation: boolean;
  /**
   * Brownfield seed for greenfield-mode projections. At year K the effective
   * GFS chain depth becomes `historicalDataYears + K - 1`, clamped to
   * `limitCalculationYears`. Ignored when `greenfieldSimulation` is false.
   */
  historicalDataYears: number;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  targetCloud: "Azure",
  growthPercent: 0,
  growthYears: 0,
  limitCalculationYears: null,
  ignoreArchiveTier: false,
  greenfieldSimulation: true,
  historicalDataYears: 0,
};
