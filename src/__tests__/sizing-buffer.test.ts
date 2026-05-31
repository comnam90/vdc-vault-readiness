import { describe, expect, it } from "vitest";
import {
  applyBufferToSeries,
  applyBufferToSizing,
  bufferFactor,
} from "@/lib/sizing-buffer";
import type { DerivedSizing } from "@/lib/sizing-derivation";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSizing(overrides?: Partial<DerivedSizing>): DerivedSizing {
  const compositionBuckets = {
    daily: 4,
    weekly: 2,
    monthly: 2,
    yearly: 1,
    immutability: 0,
    buffer: 0,
  };
  const compositionTotalTB = 9;
  return {
    totalStorageTB: 90,
    initialFullTB: null,
    dailyIncrementalTB: null,
    gfsBuckets: { daily: 4, weekly: 2, monthly: 2, yearly: 1 },
    gfsSumTB: 9,
    gfsRestorePointCount: 4,
    gfsBucketCounts: { daily: 1, weekly: 1, monthly: 1, yearly: 1 },
    performanceTaxGB: 0,
    performanceTaxTB: 0,
    compositionBuckets,
    compositionTotalTB,
    compositionProportions: {
      daily: compositionBuckets.daily / compositionTotalTB,
      weekly: compositionBuckets.weekly / compositionTotalTB,
      monthly: compositionBuckets.monthly / compositionTotalTB,
      yearly: compositionBuckets.yearly / compositionTotalTB,
      immutability: 0,
      buffer: 0,
    },
    ...overrides,
  };
}

function makeSeriesPoint(
  overrides?: Partial<GrowthSeriesPoint>,
): GrowthSeriesPoint {
  return {
    name: "Year 1",
    daily: 4,
    weekly: 2,
    monthly: 2,
    yearly: 1,
    immutability: 0,
    buffer: 0,
    total: 9,
    ...overrides,
  };
}

// ─── bufferFactor ────────────────────────────────────────────────────────────

describe("bufferFactor", () => {
  it("returns 1/0.9 for 10%", () => {
    expect(bufferFactor(10)).toBeCloseTo(1 / 0.9, 6);
  });

  it("returns 1/0.8 for 20%", () => {
    expect(bufferFactor(20)).toBeCloseTo(1 / 0.8, 6);
  });

  it("returns exactly 1 for 0%", () => {
    expect(bufferFactor(0)).toBe(1);
  });
});

// ─── applyBufferToSizing ─────────────────────────────────────────────────────

describe("applyBufferToSizing", () => {
  it("returns same reference when enabled is false", () => {
    const sizing = makeSizing();
    expect(applyBufferToSizing(sizing, false, 10)).toBe(sizing);
  });

  it("returns same reference when pct is 0", () => {
    const sizing = makeSizing();
    expect(applyBufferToSizing(sizing, true, 0)).toBe(sizing);
  });

  it("returns same reference when pct is 100 (guard against Infinity)", () => {
    const sizing = makeSizing();
    expect(applyBufferToSizing(sizing, true, 100)).toBe(sizing);
  });

  it("grosses up totalStorageTB by factor f (90 TB + 10% → 100 TB)", () => {
    const sizing = makeSizing();
    const result = applyBufferToSizing(sizing, true, 10);
    expect(result.totalStorageTB).toBeCloseTo(90 * bufferFactor(10), 6);
  });

  it("sets buffer segment = compositionTotalTB * (f - 1)", () => {
    const sizing = makeSizing(); // compositionTotalTB = 9
    const f = bufferFactor(10);
    const result = applyBufferToSizing(sizing, true, 10);
    expect(result.compositionBuckets.buffer).toBeCloseTo(9 * (f - 1), 6);
  });

  it("buffer share of new compositionTotalTB equals pct/100", () => {
    const sizing = makeSizing();
    const result = applyBufferToSizing(sizing, true, 10);
    const share = result.compositionBuckets.buffer / result.compositionTotalTB;
    expect(share).toBeCloseTo(0.1, 6);
  });

  it("scales compositionTotalTB by f", () => {
    const sizing = makeSizing(); // compositionTotalTB = 9
    const f = bufferFactor(10);
    const result = applyBufferToSizing(sizing, true, 10);
    expect(result.compositionTotalTB).toBeCloseTo(9 * f, 6);
  });

  it("preserves absolute TB for all existing composition buckets (daily/weekly/monthly/yearly)", () => {
    const sizing = makeSizing();
    const result = applyBufferToSizing(sizing, true, 10);
    expect(result.compositionBuckets.daily).toBe(4);
    expect(result.compositionBuckets.weekly).toBe(2);
    expect(result.compositionBuckets.monthly).toBe(2);
    expect(result.compositionBuckets.yearly).toBe(1);
    expect(result.compositionBuckets.immutability).toBe(0);
  });

  it("compositionProportions sums to 1 (including buffer)", () => {
    const sizing = makeSizing();
    const result = applyBufferToSizing(sizing, true, 10);
    const p = result.compositionProportions;
    const sum =
      p.daily + p.weekly + p.monthly + p.yearly + p.immutability + p.buffer;
    expect(sum).toBeCloseTo(1, 6);
  });

  it("does not mutate input totalStorageTB", () => {
    const sizing = makeSizing();
    applyBufferToSizing(sizing, true, 10);
    expect(sizing.totalStorageTB).toBe(90);
  });

  it("does not mutate input compositionBuckets.buffer", () => {
    const sizing = makeSizing();
    applyBufferToSizing(sizing, true, 10);
    expect(sizing.compositionBuckets.buffer).toBe(0);
  });

  it("returns all-zero proportions when compositionTotalTB is 0", () => {
    const zero = makeSizing({
      compositionTotalTB: 0,
      compositionBuckets: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0,
        immutability: 0,
        buffer: 0,
      },
    });
    const result = applyBufferToSizing(zero, true, 10);
    const p = result.compositionProportions;
    expect(p.daily).toBe(0);
    expect(p.weekly).toBe(0);
    expect(p.monthly).toBe(0);
    expect(p.yearly).toBe(0);
    expect(p.immutability).toBe(0);
    expect(p.buffer).toBe(0);
  });
});

// ─── applyBufferToSeries ─────────────────────────────────────────────────────

describe("applyBufferToSeries", () => {
  it("returns same reference when enabled is false", () => {
    const series = [makeSeriesPoint()];
    expect(applyBufferToSeries(series, false, 10)).toBe(series);
  });

  it("returns same reference when pct is 0", () => {
    const series = [makeSeriesPoint()];
    expect(applyBufferToSeries(series, true, 0)).toBe(series);
  });

  it("returns same reference when pct is 100 (guard against Infinity)", () => {
    const series = [makeSeriesPoint()];
    expect(applyBufferToSeries(series, true, 100)).toBe(series);
  });

  it("scales total by f and sets buffer = total_orig * (f - 1)", () => {
    const series = [makeSeriesPoint()]; // total = 9
    const f = bufferFactor(10);
    const result = applyBufferToSeries(series, true, 10);
    expect(result[0].total).toBeCloseTo(9 * f, 6);
    expect(result[0].buffer).toBeCloseTo(9 * (f - 1), 6);
  });

  it("leaves daily/weekly/monthly/yearly/immutability unchanged", () => {
    const series = [makeSeriesPoint()];
    const result = applyBufferToSeries(series, true, 10);
    expect(result[0].daily).toBe(4);
    expect(result[0].weekly).toBe(2);
    expect(result[0].monthly).toBe(2);
    expect(result[0].yearly).toBe(1);
    expect(result[0].immutability).toBe(0);
  });

  it("preserves name field", () => {
    const series = [makeSeriesPoint({ name: "Year 3" })];
    const result = applyBufferToSeries(series, true, 10);
    expect(result[0].name).toBe("Year 3");
  });

  it("does not mutate input points", () => {
    const point = makeSeriesPoint();
    applyBufferToSeries([point], true, 10);
    expect(point.total).toBe(9);
    expect(point.buffer).toBe(0);
  });

  it("handles multiple points independently", () => {
    const series = [
      makeSeriesPoint({ total: 9 }),
      makeSeriesPoint({ total: 18 }),
    ];
    const f = bufferFactor(10);
    const result = applyBufferToSeries(series, true, 10);
    expect(result[0].total).toBeCloseTo(9 * f, 6);
    expect(result[1].total).toBeCloseTo(18 * f, 6);
    expect(result[1].buffer).toBeCloseTo(18 * (f - 1), 6);
  });
});
