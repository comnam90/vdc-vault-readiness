import type { RestorePoint, VmAgentResponseData } from "@/types/veeam-api";

export interface GfsBuckets {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface BucketCounts {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface DerivedSizing {
  totalStorageTB: number;
  /** TB. Largest restore point on the performance tier (max day). null when none. */
  initialFullTB: number | null;
  /** TB. Smallest restore point on the performance tier (min day). null when none. */
  dailyIncrementalTB: number | null;
  gfsBuckets: GfsBuckets;
  /** Sum of the four buckets — the proportion-bar denominator. */
  gfsSumTB: number;
  /** Each bucket as a fraction of gfsSumTB (0 when sum is 0). */
  gfsProportions: GfsBuckets;
  /** Number of performanceTier restore points contributing to the buckets. */
  gfsRestorePointCount: number;
  /** Per-bucket restore-point counts (used in proportion-bar tooltips). */
  gfsBucketCounts: BucketCounts;
  /** GB; pass-through of performanceTierImmutabilityTaxGB. */
  performanceTaxGB: number;
  /** TB; converted from performanceTierImmutabilityTaxGB. The only /1024 in this derivation. */
  performanceTaxTB: number;
}

type Tier = "yearly" | "monthly" | "weekly" | "daily";

/**
 * Map a flag token's leading letter to its tier. Unknown letters fall through
 * to "daily" so an unexpected token never throws.
 */
function tierForLetter(letter: string): Tier {
  switch (letter) {
    case "Y":
      return "yearly";
    case "M":
      return "monthly";
    case "W":
      return "weekly";
    default:
      return "daily";
  }
}

/** Highest-tier-wins precedence: Y > M > W > D. */
const TIER_RANK: Record<Tier, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  yearly: 3,
};

/**
 * Pick the tier for a single restore point from its space-separated `flags`
 * string. Each token is `D|W|M|Y` followed by an index, e.g. "D5", "M12 Y1".
 * Returns the highest tier present; empty/unrecognised flags fall back to daily.
 */
function bucketForFlags(flags: string): Tier {
  const tokens = flags.split(/\s+/).filter(Boolean);
  let best: Tier = "daily";
  for (const token of tokens) {
    const tier = tierForLetter(token[0] ?? "");
    if (TIER_RANK[tier] > TIER_RANK[best]) best = tier;
  }
  return best;
}

/**
 * Derive sizing visualisation inputs from a Veeam VSE API response.
 *
 * Bucketing rule (highest tier wins): each restore point is routed into
 * exactly one of {daily, weekly, monthly, yearly} based on the highest-tier
 * letter present in its `flags` string. This guarantees exclusive buckets so
 * the proportion bar sums coherently.
 *
 * Filter: only restore points with `pointType === "performanceTier"` are
 * counted — those represent the storage that lives on the Performance Tier
 * (which Vault provides). Capacity-tier and archive-tier points (if present
 * in future responses) are excluded from this composition.
 *
 * Units: `backupCapacity` is already in TB on the wire — buckets, baselines,
 * and the GFS sum pass it through unchanged. The only `/1024` conversion here
 * is `performanceTierImmutabilityTaxGB → performanceTaxTB` (the field name
 * carries its own unit).
 */
export function deriveSizing(data: VmAgentResponseData): DerivedSizing {
  const performancePoints: RestorePoint[] = (data.restorePoints ?? []).filter(
    (p) => p.pointType === "performanceTier",
  );

  const gfsBuckets: GfsBuckets = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  };
  const gfsBucketCounts: BucketCounts = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  };
  for (const point of performancePoints) {
    const tier = bucketForFlags(point.flags ?? "");
    gfsBuckets[tier] += point.backupCapacity;
    gfsBucketCounts[tier] += 1;
  }

  const gfsSumTB =
    gfsBuckets.daily +
    gfsBuckets.weekly +
    gfsBuckets.monthly +
    gfsBuckets.yearly;

  const gfsProportions: GfsBuckets =
    gfsSumTB > 0
      ? {
          daily: gfsBuckets.daily / gfsSumTB,
          weekly: gfsBuckets.weekly / gfsSumTB,
          monthly: gfsBuckets.monthly / gfsSumTB,
          yearly: gfsBuckets.yearly / gfsSumTB,
        }
      : { daily: 0, weekly: 0, monthly: 0, yearly: 0 };

  let initialFullTB: number | null = null;
  let dailyIncrementalTB: number | null = null;
  if (performancePoints.length > 0) {
    let minDayPoint = performancePoints[0];
    let maxDayPoint = performancePoints[0];
    for (const point of performancePoints) {
      if (point.day < minDayPoint.day) minDayPoint = point;
      if (point.day > maxDayPoint.day) maxDayPoint = point;
    }
    dailyIncrementalTB = minDayPoint.backupCapacity;
    initialFullTB = maxDayPoint.backupCapacity;
  }

  return {
    totalStorageTB: data.totalStorageTB,
    initialFullTB,
    dailyIncrementalTB,
    gfsBuckets,
    gfsSumTB,
    gfsProportions,
    gfsRestorePointCount: performancePoints.length,
    gfsBucketCounts,
    performanceTaxGB: data.performanceTierImmutabilityTaxGB,
    performanceTaxTB: data.performanceTierImmutabilityTaxGB / 1024,
  };
}
