export type TargetCloud = "Azure" | "AWS";

export interface GlobalSettings {
  targetCloud: TargetCloud;
  growthPercent: number;
  growthYears: number;
  limitCalculationYears: number | null;
  limitCalculationMonths: number;
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
  /**
   * When true, the final sizing result is grossed up by `1 / (1 - bufferPercent / 100)`
   * to reserve headroom. This is a pure display transform and never re-triggers
   * the Veeam sizing API.
   */
  bufferEnabled: boolean;
  /**
   * Percentage of headroom to add when `bufferEnabled` is true. Clamped to [1, 30].
   */
  bufferPercent: number;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  targetCloud: "Azure",
  growthPercent: 0,
  growthYears: 0,
  limitCalculationYears: null,
  limitCalculationMonths: 0,
  ignoreArchiveTier: false,
  greenfieldSimulation: true,
  historicalDataYears: 0,
  bufferEnabled: false,
  bufferPercent: 10,
};
