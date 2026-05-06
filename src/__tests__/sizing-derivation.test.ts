import { describe, it, expect } from "vitest";
import { deriveSizing } from "@/lib/sizing-derivation";
import type { RestorePoint, VmAgentResponseData } from "@/types/veeam-api";
import vseSampleResponse from "./fixtures/vse-sample-response.json";

function rp(overrides: Partial<RestorePoint> = {}): RestorePoint {
  return {
    pointType: "performanceTier",
    day: 1,
    backupCapacity: 0,
    isFull: false,
    isGFS: false,
    isImmutable: false,
    flags: "D1",
    ...overrides,
  };
}

function buildData(
  overrides: Partial<VmAgentResponseData> = {},
): VmAgentResponseData {
  return {
    totalStorageTB: 0,
    proxyCompute: { compute: { cores: 0, ram: 0, volumes: [] } },
    repoCompute: { compute: { cores: 0, ram: 0, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 0,
    capacityTierImmutabilityTaxGB: 0,
    restorePoints: [],
    ...overrides,
  };
}

describe("deriveSizing", () => {
  it("passes total storage through unchanged", () => {
    const result = deriveSizing(buildData({ totalStorageTB: 42.5 }));
    expect(result.totalStorageTB).toBe(42.5);
  });

  it("converts performanceTierImmutabilityTaxGB to TB (the only /1024 in the derivation)", () => {
    const result = deriveSizing(
      buildData({ performanceTierImmutabilityTaxGB: 1024 }),
    );
    expect(result.performanceTaxTB).toBeCloseTo(1.0, 6);
  });

  it("treats backupCapacity as TB without conversion", () => {
    const result = deriveSizing(
      buildData({
        restorePoints: [rp({ backupCapacity: 12.5, flags: "D1" })],
      }),
    );
    expect(result.gfsBuckets.daily).toBeCloseTo(12.5, 6);
  });

  it("returns zeroed buckets and null baselines for empty restorePoints", () => {
    const result = deriveSizing(buildData({ restorePoints: [] }));
    expect(result.gfsBuckets).toEqual({
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
    });
    expect(result.compositionProportions).toEqual({
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      immutability: 0,
    });
    expect(result.gfsSumTB).toBe(0);
    expect(result.compositionTotalTB).toBe(0);
    expect(result.gfsRestorePointCount).toBe(0);
    expect(result.initialFullTB).toBeNull();
    expect(result.dailyIncrementalTB).toBeNull();
  });

  it("sums single-tier daily tokens into the daily bucket", () => {
    const points: RestorePoint[] = Array.from({ length: 10 }, (_, i) =>
      rp({ day: i + 1, backupCapacity: 1, flags: `D${i + 1}` }),
    );
    const result = deriveSizing(buildData({ restorePoints: points }));
    expect(result.gfsBuckets.daily).toBeCloseTo(10, 6);
    expect(result.gfsBuckets.weekly).toBe(0);
    expect(result.gfsBuckets.monthly).toBe(0);
    expect(result.gfsBuckets.yearly).toBe(0);
  });

  it('routes a "M12 Y1" multi-tier point to the yearly bucket only', () => {
    const result = deriveSizing(
      buildData({
        restorePoints: [
          rp({ day: 365, backupCapacity: 5.25, flags: "M12 Y1" }),
        ],
      }),
    );
    expect(result.gfsBuckets.yearly).toBeCloseTo(5.25, 6);
    expect(result.gfsBuckets.monthly).toBe(0);
    expect(result.gfsBuckets.weekly).toBe(0);
    expect(result.gfsBuckets.daily).toBe(0);
  });

  it("applies Y > M > W > D precedence across synthetic multi-tier flags", () => {
    const yearly = deriveSizing(
      buildData({
        restorePoints: [rp({ backupCapacity: 1, flags: "D5 W2 M7 Y3" })],
      }),
    );
    expect(yearly.gfsBuckets.yearly).toBeCloseTo(1, 6);
    expect(yearly.gfsBuckets.monthly).toBe(0);

    const monthly = deriveSizing(
      buildData({
        restorePoints: [rp({ backupCapacity: 1, flags: "D5 W2 M7" })],
      }),
    );
    expect(monthly.gfsBuckets.monthly).toBeCloseTo(1, 6);
    expect(monthly.gfsBuckets.weekly).toBe(0);

    const weekly = deriveSizing(
      buildData({
        restorePoints: [rp({ backupCapacity: 1, flags: "D5 W2" })],
      }),
    );
    expect(weekly.gfsBuckets.weekly).toBeCloseTo(1, 6);
    expect(weekly.gfsBuckets.daily).toBe(0);
  });

  it("excludes non-performanceTier points from the GFS bucketing", () => {
    const result = deriveSizing(
      buildData({
        restorePoints: [
          rp({ pointType: "capacityTier", backupCapacity: 99, flags: "D1" }),
          rp({ pointType: "performanceTier", backupCapacity: 1, flags: "D1" }),
        ],
      }),
    );
    expect(result.gfsBuckets.daily).toBeCloseTo(1, 6);
    expect(result.gfsRestorePointCount).toBe(1);
  });

  it("bucket sums equal the total filtered backupCapacity over a 100-point corpus", () => {
    const tiers = ["D", "W", "M", "Y"];
    const points: RestorePoint[] = Array.from({ length: 100 }, (_, i) => {
      const tier = tiers[i % tiers.length];
      return rp({
        day: i + 1,
        backupCapacity: 0.5 + (i % 7) * 0.1,
        flags: `${tier}${i + 1}`,
      });
    });
    const totalCapacity = points.reduce((s, p) => s + p.backupCapacity, 0);
    const result = deriveSizing(buildData({ restorePoints: points }));
    const bucketSum =
      result.gfsBuckets.daily +
      result.gfsBuckets.weekly +
      result.gfsBuckets.monthly +
      result.gfsBuckets.yearly;
    expect(bucketSum).toBeCloseTo(totalCapacity, 6);
    expect(result.gfsSumTB).toBeCloseTo(totalCapacity, 6);
  });

  it('falls back to daily for unknown leading letters (e.g. "X1")', () => {
    const result = deriveSizing(
      buildData({
        restorePoints: [rp({ backupCapacity: 3, flags: "X1" })],
      }),
    );
    expect(result.gfsBuckets.daily).toBeCloseTo(3, 6);
    expect(result.gfsBuckets.weekly).toBe(0);
    expect(result.gfsBuckets.monthly).toBe(0);
    expect(result.gfsBuckets.yearly).toBe(0);
  });

  it("falls back to daily for empty flag strings", () => {
    const result = deriveSizing(
      buildData({
        restorePoints: [rp({ backupCapacity: 2, flags: "" })],
      }),
    );
    expect(result.gfsBuckets.daily).toBeCloseTo(2, 6);
  });

  it("compositionProportions sum to 1 when total > 0; sum to 0 when empty", () => {
    const empty = deriveSizing(buildData({ restorePoints: [] }));
    const emptySum =
      empty.compositionProportions.daily +
      empty.compositionProportions.weekly +
      empty.compositionProportions.monthly +
      empty.compositionProportions.yearly +
      empty.compositionProportions.immutability;
    expect(emptySum).toBe(0);

    const filled = deriveSizing(
      buildData({
        performanceTierImmutabilityTaxGB: 1024, // 1 TB
        restorePoints: [
          rp({ backupCapacity: 1, flags: "D1" }),
          rp({ backupCapacity: 2, flags: "W1" }),
          rp({ backupCapacity: 3, flags: "M1" }),
          rp({ backupCapacity: 4, flags: "Y1" }),
        ],
      }),
    );
    const filledSum =
      filled.compositionProportions.daily +
      filled.compositionProportions.weekly +
      filled.compositionProportions.monthly +
      filled.compositionProportions.yearly +
      filled.compositionProportions.immutability;
    expect(filledSum).toBeCloseTo(1, 6);
    expect(filled.compositionProportions.immutability).toBeGreaterThan(0);
  });

  it("compositionTotalTB equals gfsSumTB + performanceTaxTB", () => {
    const result = deriveSizing(
      buildData({
        performanceTierImmutabilityTaxGB: 2048, // 2 TB
        restorePoints: [
          rp({ backupCapacity: 4, flags: "D1" }),
          rp({ backupCapacity: 6, flags: "Y1" }),
        ],
      }),
    );
    expect(result.gfsSumTB).toBeCloseTo(10, 6);
    expect(result.performanceTaxTB).toBeCloseTo(2, 6);
    expect(result.compositionTotalTB).toBeCloseTo(12, 6);
    expect(result.compositionBuckets.immutability).toBeCloseTo(2, 6);
    expect(result.compositionBuckets.daily).toBeCloseTo(4, 6);
    expect(result.compositionBuckets.yearly).toBeCloseTo(6, 6);
  });

  it("derives initialFullTB from max(day) and dailyIncrementalTB from min(day) without unit conversion", () => {
    const result = deriveSizing(
      buildData({
        restorePoints: [
          rp({ day: 1, backupCapacity: 0.2625, flags: "D1" }),
          rp({ day: 365, backupCapacity: 4.725, flags: "Y1" }),
          rp({ day: 1099, backupCapacity: 5.25, flags: "Y3" }),
        ],
      }),
    );
    expect(result.dailyIncrementalTB).toBeCloseTo(0.2625, 6);
    expect(result.initialFullTB).toBeCloseTo(5.25, 6);
  });

  it("matches a hand-computed baseline against the captured live response fixture", () => {
    const data = (vseSampleResponse as { data: VmAgentResponseData }).data;
    const result = deriveSizing(data);

    expect(result.gfsRestorePointCount).toBe(48);
    expect(result.gfsBucketCounts).toEqual({
      daily: 30,
      weekly: 4,
      monthly: 11,
      yearly: 3,
    });
    expect(result.gfsBuckets.yearly).toBeCloseTo(14.7, 4);
    expect(result.gfsBuckets.monthly).toBeCloseTo(14.4375, 4);
    expect(result.gfsBuckets.weekly).toBeCloseTo(1.05, 4);
    expect(result.gfsBuckets.daily).toBeCloseTo(7.875, 4);
    expect(result.gfsSumTB).toBeCloseTo(38.0625, 4);
    expect(result.dailyIncrementalTB).toBeCloseTo(0.2625, 6);
    expect(result.initialFullTB).toBeCloseTo(5.25, 6);
  });
});
