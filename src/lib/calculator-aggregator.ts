import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { CalculatorSummary } from "@/types/calculator";

interface GfsResult {
  weekly: number | null;
  monthly: number | null;
  yearly: number | null;
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
  sessions: SafeJobSession[],
): number | null {
  let weightedSum = 0;
  let totalSize = 0;

  for (const session of sessions) {
    if (
      session.MaxDataSize != null &&
      session.MaxDataSize > 0 &&
      session.AvgChangeRate != null
    ) {
      weightedSum += session.AvgChangeRate * session.MaxDataSize;
      totalSize += session.MaxDataSize;
    }
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

export function buildCalculatorSummary(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
): CalculatorSummary {
  const gfs = aggregateGfsMax(jobs);

  return {
    totalSourceDataTB: calculateTotalSourceDataTB(jobs),
    weightedAvgChangeRate: calculateWeightedChangeRate(sessions),
    immutabilityDays: 30,
    maxRetentionDays: getMaxRetentionDays(jobs),
    gfsWeekly: gfs.weekly,
    gfsMonthly: gfs.monthly,
    gfsYearly: gfs.yearly,
  };
}
