import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { deriveSizing } from "@/lib/sizing-derivation";
import { callVmAgentApi } from "@/lib/veeam-api";
import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { GlobalSettings } from "@/types/settings";

const MAX_PROJECTION_YEARS = 10;
const MIN_PROJECTION_YEARS = 1;
const DEFAULT_PROJECTION_YEARS = 5;

export interface GrowthSeriesPoint {
  /** Display label, e.g. "Year 1". */
  name: string;
  /** TB on the daily-retention tier of the proportion-bar composition. */
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  /** TB of immutability overhead on the performance tier. */
  immutability: number;
  /** Sum of the five buckets — height of the stacked bar. */
  total: number;
}

export interface GenerateGrowthSeriesArgs {
  jobs: SafeJob[];
  sessions: SafeJobSession[];
  excludedJobNames?: Set<string>;
  settings: GlobalSettings;
  jobCount: number;
  vbrVersion: string;
  productVersionOverride?: number;
}

/**
 * Number of years the chart will project. Bounded by [1, 10] to keep the
 * concurrent API fan-out from inflating; see ADR 0001.
 */
export function getProjectionYears(settings: GlobalSettings): number {
  const requested =
    settings.limitCalculationYears ??
    Math.max(DEFAULT_PROJECTION_YEARS, settings.growthYears || 0);
  return Math.min(
    MAX_PROJECTION_YEARS,
    Math.max(MIN_PROJECTION_YEARS, requested),
  );
}

/**
 * Project storage composition year-over-year by fanning out one Veeam sizing
 * API call per year (concurrently via Promise.all). Each call varies
 * `growthYears`; in greenfield mode it also varies `limitCalculationYears`
 * so the GFS chain "builds up" alongside source-data growth.
 */
export async function generateGrowthSeries(
  args: GenerateGrowthSeriesArgs,
): Promise<GrowthSeriesPoint[]> {
  const {
    jobs,
    sessions,
    excludedJobNames = new Set<string>(),
    settings,
    jobCount,
    vbrVersion,
    productVersionOverride,
  } = args;

  const projectionYears = getProjectionYears(settings);
  const years = Array.from({ length: projectionYears }, (_, i) => i + 1);

  return Promise.all(
    years.map(async (year): Promise<GrowthSeriesPoint> => {
      let perYearLimit: number | null = settings.limitCalculationYears;
      if (settings.greenfieldSimulation) {
        const baseChain =
          settings.historicalDataYears > 0
            ? settings.historicalDataYears + year - 1
            : year;
        const maxChain = settings.limitCalculationYears ?? Infinity;
        perYearLimit = Math.min(baseChain, maxChain);
      }
      const tempSettings: GlobalSettings = {
        ...settings,
        growthYears: year,
        limitCalculationYears: perYearLimit,
      };
      const summary = buildCalculatorSummary(
        jobs,
        sessions,
        excludedJobNames,
        tempSettings,
      );
      const response = await callVmAgentApi(
        summary,
        jobCount,
        vbrVersion,
        productVersionOverride,
        tempSettings,
      );
      const sizing = deriveSizing(response.data);
      return {
        name: `Year ${year}`,
        daily: sizing.compositionBuckets.daily,
        weekly: sizing.compositionBuckets.weekly,
        monthly: sizing.compositionBuckets.monthly,
        yearly: sizing.compositionBuckets.yearly,
        immutability: sizing.compositionBuckets.immutability,
        total: sizing.compositionTotalTB,
      };
    }),
  );
}
