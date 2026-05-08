import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { deriveSizing } from "@/lib/sizing-derivation";
import { callVmAgentApi } from "@/lib/veeam-api";
import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { GlobalSettings } from "@/types/settings";

const MAX_PROJECTION_YEARS = 12;
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
 * Number of years the chart will project. Bounded by [1, 12] so the yearly
 * view mirrors monthly mode's 12-bar density and keeps API fan-out finite;
 * see ADR 0001.
 *
 * When `limitCalculationYears` is null (cap disabled), the floor lifts to
 * `naturalRetentionYears` derived from job data so the chart's final bar
 * reaches the hero's horizon instead of always stopping at the 5y default.
 */
export function getProjectionYears(
  settings: GlobalSettings,
  naturalRetentionYears = 0,
): number {
  const requested =
    settings.limitCalculationYears ??
    Math.max(
      DEFAULT_PROJECTION_YEARS,
      settings.growthYears || 0,
      naturalRetentionYears,
    );
  return Math.min(
    MAX_PROJECTION_YEARS,
    Math.max(MIN_PROJECTION_YEARS, requested),
  );
}

/**
 * Longest retention horizon implied by the job data, in years. Considers all
 * GFS buckets so a job with e.g. `Monthly:120` (10y of monthly retention) and
 * no yearly points still reports a 10y horizon. Used to extend the default
 * projection length when no explicit retention cap is set.
 *
 * Conversions follow Veeam's calendar conventions: 52 weeks / 12 months / 365
 * days per year; results are rounded up to the nearest whole year so a chain
 * that just crosses a boundary (e.g. 13 months) is reflected as the next year
 * on the chart.
 */
export function naturalRetentionYears(summary: {
  maxRetentionDays: number | null;
  gfsWeekly: number | null;
  gfsMonthly: number | null;
  gfsYearly: number | null;
}): number {
  return Math.max(
    Math.ceil((summary.maxRetentionDays ?? 0) / 365),
    Math.ceil((summary.gfsWeekly ?? 0) / 52),
    Math.ceil((summary.gfsMonthly ?? 0) / 12),
    summary.gfsYearly ?? 0,
  );
}

/**
 * Veeam sizing API allows up to 10 concurrent requests; chunk to 5 to leave
 * headroom for any other in-flight calls (e.g. repositories tab).
 */
const BATCH_SIZE = 5;

/**
 * Project storage composition by fanning out Veeam sizing API calls in
 * batches of {@link BATCH_SIZE}. When the cap retention horizon is 12 months
 * or less the chart renders month-by-month; otherwise year-by-year. Each
 * call varies `growthYears` (yearly) or holds it at 0 (monthly); greenfield
 * mode additionally walks the GFS chain depth so it "builds up" alongside
 * source-data growth.
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

  const capYears = settings.limitCalculationYears ?? 0;
  const capMonths = settings.limitCalculationMonths ?? 0;
  const totalCapMonths = capYears * 12 + capMonths;
  const capActive =
    settings.limitCalculationYears !== null && totalCapMonths > 0;
  // Boundary is intentional per spec: "12 months or less" → monthly scale,
  // so 1y 0m (and 0y 12m) routes here, not the yearly path.
  const isMonthlyScale = capActive && totalCapMonths <= 12;
  // Natural retention is only consulted by the yearly path when the user has
  // no cap set; skip the extra summary build in monthly mode or when an
  // explicit cap drives the step count.
  const needsNaturalYears =
    !isMonthlyScale && settings.limitCalculationYears === null;
  const naturalYears = needsNaturalYears
    ? naturalRetentionYears(
        buildCalculatorSummary(jobs, sessions, excludedJobNames, settings),
      )
    : 0;
  const stepCount = isMonthlyScale
    ? totalCapMonths
    : getProjectionYears(settings, naturalYears);
  const steps = Array.from({ length: stepCount }, (_, i) => i + 1);

  const projectStep = async (step: number): Promise<GrowthSeriesPoint> => {
    const tempSettings: GlobalSettings = isMonthlyScale
      ? buildMonthlySettings(settings, step, totalCapMonths)
      : buildYearlySettings(settings, step);
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
      name: isMonthlyScale ? `Month ${step}` : `Year ${step}`,
      daily: sizing.compositionBuckets.daily,
      weekly: sizing.compositionBuckets.weekly,
      monthly: sizing.compositionBuckets.monthly,
      yearly: sizing.compositionBuckets.yearly,
      immutability: sizing.compositionBuckets.immutability,
      total: sizing.compositionTotalTB,
    };
  };

  const results: GrowthSeriesPoint[] = [];
  for (let start = 0; start < steps.length; start += BATCH_SIZE) {
    const chunk = steps.slice(start, start + BATCH_SIZE);
    const chunkResults = await Promise.all(chunk.map(projectStep));
    results.push(...chunkResults);
  }
  return results;
}

function buildYearlySettings(
  settings: GlobalSettings,
  year: number,
): GlobalSettings {
  let perYearLimit: number | null = settings.limitCalculationYears;
  if (settings.greenfieldSimulation) {
    const baseChain =
      settings.historicalDataYears > 0
        ? settings.historicalDataYears + year - 1
        : year;
    const maxChain = settings.limitCalculationYears ?? Infinity;
    perYearLimit = Math.min(baseChain, maxChain);
  }
  // Cap per-step growth to settings.growthYears so the chart's growth
  // matches the global setting: 0 → flat across all bars; N → ramps to N
  // then holds. Aligns the chart's final bar with the hero card, which
  // also uses settings.growthYears as-is.
  return {
    ...settings,
    growthYears: Math.min(year, settings.growthYears),
    limitCalculationYears: perYearLimit,
  };
}

function buildMonthlySettings(
  settings: GlobalSettings,
  step: number,
  totalCapMonths: number,
): GlobalSettings {
  if (!settings.greenfieldSimulation) {
    return { ...settings, growthYears: 0 };
  }
  // Mirrors the yearly path: when there's no brownfield seed, step K means
  // the chain has been running for K months (not K-1, which would leave step
  // 1 at 0 months and disable capJob's cap-active check, sending the full
  // unclamped GFS retention to the API).
  const baseChainMonths =
    settings.historicalDataYears > 0
      ? settings.historicalDataYears * 12 + step - 1
      : step;
  const effectiveMonths = Math.min(baseChainMonths, totalCapMonths);
  return {
    ...settings,
    growthYears: 0,
    limitCalculationYears: Math.floor(effectiveMonths / 12),
    limitCalculationMonths: effectiveMonths % 12,
  };
}
