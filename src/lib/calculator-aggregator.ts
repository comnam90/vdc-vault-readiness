import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { CalculatorSummary } from "@/types/calculator";
import { DEFAULT_SETTINGS, type GlobalSettings } from "@/types/settings";
import { MINIMUM_RETENTION_DAYS, DEFAULT_IMMUTABILITY_DAYS } from "./constants";
import { formatShortGfs } from "./format-utils";

export interface GfsResult {
  weekly: number | null;
  monthly: number | null;
  yearly: number | null;
}

/**
 * Returns the total cap horizon in days implied by the given settings, or
 * `Infinity` when no cap is active. A cap is active only when
 * `limitCalculationYears` is set (not null) and the resulting day count is
 * positive — matching the `capActive` guard used elsewhere in the pipeline.
 */
export function globalCapDays(settings: GlobalSettings): number {
  const capYears = settings.limitCalculationYears ?? 0;
  const capMonths = settings.limitCalculationMonths ?? 0;
  const totalCapDays = capYears * 365 + capMonths * 30;
  const capActive = settings.limitCalculationYears !== null && totalCapDays > 0;
  return capActive ? totalCapDays : Infinity;
}

/**
 * Clamps each bucket in `gfs` to the slot count that fits within `capDays`,
 * using the same unit conversions as `capJob` (365 d/yr, 30 d/mo, 7 d/wk).
 * Returns `gfs` unchanged when `capDays` is infinite (no active cap).
 * Null values are preserved as-is.
 */
export function capGfs(gfs: GfsResult, capDays: number): GfsResult {
  if (!Number.isFinite(capDays)) {
    return gfs;
  }
  return {
    weekly:
      gfs.weekly !== null
        ? Math.min(gfs.weekly, Math.floor(capDays / 7))
        : null,
    monthly:
      gfs.monthly !== null
        ? Math.min(gfs.monthly, Math.floor(capDays / 30))
        : null,
    yearly:
      gfs.yearly !== null
        ? Math.min(gfs.yearly, Math.floor(capDays / 365))
        : null,
  };
}

export function calculateTotalSourceDataTB(jobs: SafeJob[]): number | null {
  let sumGB = 0;
  let hasValid = false;

  for (const job of jobs) {
    if (job.SourceSizeGB != null) {
      sumGB += job.SourceSizeGB;
      hasValid = true;
    }
  }

  return hasValid ? sumGB / 1024 : null;
}

export function calculateWeightedChangeRate(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
): number | null {
  const changeRateByJob = new Map<string, number>();

  for (const session of sessions) {
    if (session.AvgChangeRate != null) {
      changeRateByJob.set(session.JobName, session.AvgChangeRate);
    }
  }

  let weightedSum = 0;
  let totalSize = 0;

  for (const job of jobs) {
    if (job.SourceSizeGB == null || job.SourceSizeGB <= 0) {
      continue;
    }

    const changeRate = changeRateByJob.get(job.JobName);

    if (changeRate == null) {
      continue;
    }

    weightedSum += changeRate * job.SourceSizeGB;
    totalSize += job.SourceSizeGB;
  }

  return totalSize > 0 ? weightedSum / totalSize : null;
}

export function getMaxRetentionDays(jobs: SafeJob[]): number | null {
  let max: number | null = null;

  for (const job of jobs) {
    if (job.RetainDays != null) {
      if (max === null || job.RetainDays > max) {
        max = job.RetainDays;
      }
    }
  }

  return max;
}

export function parseGfsDetails(gfsString: string | null): GfsResult {
  const result: GfsResult = { weekly: null, monthly: null, yearly: null };

  if (!gfsString) {
    return result;
  }

  const pairs = gfsString.split(",");

  for (const pair of pairs) {
    const trimmed = pair.trim();
    const colonIndex = trimmed.indexOf(":");

    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, colonIndex).toLowerCase();
    const value = Number(trimmed.substring(colonIndex + 1));

    if (Number.isNaN(value)) {
      continue;
    }

    if (key === "weekly") {
      result.weekly = value;
    } else if (key === "monthly") {
      result.monthly = value;
    } else if (key === "yearly") {
      result.yearly = value;
    }
  }

  return result;
}

export function aggregateGfsMax(jobs: SafeJob[]): GfsResult {
  const result: GfsResult = { weekly: null, monthly: null, yearly: null };

  for (const job of jobs) {
    if (!job.GfsDetails) {
      continue;
    }

    const parsed = parseGfsDetails(job.GfsDetails);

    if (parsed.weekly != null) {
      result.weekly =
        result.weekly === null
          ? parsed.weekly
          : Math.max(result.weekly, parsed.weekly);
    }

    if (parsed.monthly != null) {
      result.monthly =
        result.monthly === null
          ? parsed.monthly
          : Math.max(result.monthly, parsed.monthly);
    }

    if (parsed.yearly != null) {
      result.yearly =
        result.yearly === null
          ? parsed.yearly
          : Math.max(result.yearly, parsed.yearly);
    }
  }

  return result;
}

function serializeGfs(gfs: GfsResult): string | null {
  const parts: string[] = [];
  if (gfs.weekly != null) parts.push(`Weekly:${gfs.weekly}`);
  if (gfs.monthly != null) parts.push(`Monthly:${gfs.monthly}`);
  if (gfs.yearly != null) parts.push(`Yearly:${gfs.yearly}`);
  return parts.length > 0 ? parts.join(",") : null;
}

function capJob(job: SafeJob, settings: GlobalSettings): SafeJob {
  const globalDays = globalCapDays(settings);

  const archiveCapDays =
    job.archiveOffloadDays != null && !settings.ignoreArchiveTier
      ? job.archiveOffloadDays
      : Infinity;

  // Daily retention caps to the global horizon only.
  // GFS caps to the tighter of global horizon and archive offload
  // (Symmetric with the input math: 365-day year, 30-day month, 7-day week.
  // Using calendar conversions e.g. cap_days * 12 / 365 under-counts a
  // 3-month cap as 2 monthly slots — weeklies and monthlies coexist on the
  // Vault, so a 3-month cap should retain 3 monthly slots.)
  const gfsCapDays = Math.min(globalDays, archiveCapDays);

  const capped: SafeJob = { ...job };

  if (job.RetainDays != null && Number.isFinite(globalDays)) {
    capped.RetainDays = Math.min(job.RetainDays, globalDays);
  }

  if (job.GfsDetails) {
    const parsed = parseGfsDetails(job.GfsDetails);
    capped.GfsDetails = serializeGfs(capGfs(parsed, gfsCapDays));
  }

  return capped;
}

export function buildCalculatorSummary(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
  excludedJobNames: Set<string> = new Set(),
  settings: GlobalSettings = DEFAULT_SETTINGS,
): CalculatorSummary {
  const filteredJobs =
    excludedJobNames.size > 0
      ? jobs.filter((j) => !excludedJobNames.has(j.JobName))
      : jobs;

  const cappedJobs = filteredJobs.map((j) => capJob(j, settings));

  const gfs = aggregateGfsMax(cappedJobs);
  const originalMax = getMaxRetentionDays(cappedJobs);

  const sourceByType = new Map<string, number>();
  for (const job of cappedJobs) {
    if (job.SourceSizeGB == null) continue;
    const key = job.JobType || "Unknown";
    sourceByType.set(key, (sourceByType.get(key) ?? 0) + job.SourceSizeGB);
  }
  const sourceDataBreakdown = [...sourceByType.entries()]
    .map(([type, gb]) => ({ type, tb: gb / 1024 }))
    .sort((a, b) => b.tb - a.tb);

  const gfsCounts = new Map<string, number>();
  for (const job of cappedJobs) {
    if (!job.GfsDetails) continue;
    const policy = formatShortGfs(job.GfsDetails);
    if (!policy) continue;
    gfsCounts.set(policy, (gfsCounts.get(policy) ?? 0) + 1);
  }
  const gfsDistribution = [...gfsCounts.entries()]
    .map(([policy, count]) => ({ policy, count }))
    .sort((a, b) => b.count - a.count);

  const retentionCounts = new Map<number, number>();
  for (const job of cappedJobs) {
    if (job.RetainDays == null) continue;
    retentionCounts.set(
      job.RetainDays,
      (retentionCounts.get(job.RetainDays) ?? 0) + 1,
    );
  }
  const retentionDistribution = [...retentionCounts.entries()]
    .map(([days, count]) => ({ days, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSourceDataTB: calculateTotalSourceDataTB(cappedJobs),
    weightedAvgChangeRate: calculateWeightedChangeRate(cappedJobs, sessions),
    immutabilityDays: DEFAULT_IMMUTABILITY_DAYS,
    maxRetentionDays:
      originalMax !== null
        ? Math.max(originalMax, MINIMUM_RETENTION_DAYS)
        : MINIMUM_RETENTION_DAYS,
    originalMaxRetentionDays: originalMax,
    gfsWeekly: gfs.weekly,
    gfsMonthly: gfs.monthly,
    gfsYearly: gfs.yearly,
    sourceDataBreakdown,
    gfsDistribution,
    retentionDistribution,
  };
}
