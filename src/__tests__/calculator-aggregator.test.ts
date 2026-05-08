import { describe, it, expect } from "vitest";
import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { CalculatorSummary } from "@/types/calculator";
import {
  calculateTotalSourceDataTB,
  calculateWeightedChangeRate,
  getMaxRetentionDays,
  parseGfsDetails,
  aggregateGfsMax,
  buildCalculatorSummary,
} from "@/lib/calculator-aggregator";
import { makeJob, makeSession, makeSettings } from "./fixtures";

describe("calculateTotalSourceDataTB", () => {
  it("sums SourceSizeGB values and converts to TB (divide by 1024)", () => {
    const jobs: SafeJob[] = [
      makeJob({ SourceSizeGB: 512 }),
      makeJob({ SourceSizeGB: 512 }),
    ];
    expect(calculateTotalSourceDataTB(jobs)).toBeCloseTo(1.0, 4);
  });

  it("skips null SourceSizeGB values", () => {
    const jobs: SafeJob[] = [
      makeJob({ SourceSizeGB: 1024 }),
      makeJob({ SourceSizeGB: null }),
      makeJob({ SourceSizeGB: 1024 }),
    ];
    expect(calculateTotalSourceDataTB(jobs)).toBeCloseTo(2.0, 4);
  });

  it("skips default null SourceSizeGB from helper", () => {
    const jobs: SafeJob[] = [
      makeJob({ SourceSizeGB: 1024 }),
      makeJob({}), // uses default SourceSizeGB: null
    ];
    expect(calculateTotalSourceDataTB(jobs)).toBeCloseTo(1.0, 4);
  });

  it("returns null for empty array", () => {
    expect(calculateTotalSourceDataTB([])).toBeNull();
  });

  it("returns null when all SourceSizeGB values are null", () => {
    const jobs: SafeJob[] = [
      makeJob({ SourceSizeGB: null }),
      makeJob({ SourceSizeGB: null }),
    ];
    expect(calculateTotalSourceDataTB(jobs)).toBeNull();
  });

  it("includes zero SourceSizeGB in sum", () => {
    const jobs: SafeJob[] = [
      makeJob({ SourceSizeGB: 0 }),
      makeJob({ SourceSizeGB: 10.24 }),
    ];
    expect(calculateTotalSourceDataTB(jobs)).toBeCloseTo(0.01, 4);
  });

  it("handles fractional GB values correctly", () => {
    const jobs: SafeJob[] = [
      makeJob({ SourceSizeGB: 6.656 }),
      makeJob({ SourceSizeGB: 8.3968 }),
    ];
    // (6.656 + 8.3968) / 1024 ≈ 0.0147
    expect(calculateTotalSourceDataTB(jobs)).toBeCloseTo(0.0147, 4);
  });
});

describe("calculateWeightedChangeRate", () => {
  it("calculates weighted average by SourceSizeGB, correlating jobs and sessions by JobName", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: 100 }),
      makeJob({ JobName: "JobB", SourceSizeGB: 50 }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 10 }),
      makeSession({ JobName: "JobB", AvgChangeRate: 20 }),
    ];
    // Σ(rate × size) / Σ(size) = (10*100 + 20*50) / (100+50) = 13.33
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeCloseTo(13.33, 1);
  });

  it("excludes jobs with null SourceSizeGB", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: 100 }),
      makeJob({ JobName: "JobB", SourceSizeGB: null }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 10 }),
      makeSession({ JobName: "JobB", AvgChangeRate: 50 }),
    ];
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeCloseTo(10, 1);
  });

  it("excludes jobs with zero SourceSizeGB", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: 100 }),
      makeJob({ JobName: "JobB", SourceSizeGB: 0 }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 10 }),
      makeSession({ JobName: "JobB", AvgChangeRate: 50 }),
    ];
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeCloseTo(10, 1);
  });

  it("excludes jobs with no matching session", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: 100 }),
      makeJob({ JobName: "JobB", SourceSizeGB: 200 }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 10 }),
    ];
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeCloseTo(10, 1);
  });

  it("excludes sessions with null AvgChangeRate", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: 100 }),
      makeJob({ JobName: "JobB", SourceSizeGB: 200 }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 10 }),
      makeSession({ JobName: "JobB", AvgChangeRate: null }),
    ];
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeCloseTo(10, 1);
  });

  it("returns null for empty arrays", () => {
    expect(calculateWeightedChangeRate([], [])).toBeNull();
  });

  it("returns null when no jobs have valid SourceSizeGB", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: null }),
      makeJob({ JobName: "JobB", SourceSizeGB: null }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 10 }),
      makeSession({ JobName: "JobB", AvgChangeRate: 20 }),
    ];
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeNull();
  });

  it("handles single valid job-session pair", () => {
    const jobs: SafeJob[] = [makeJob({ JobName: "JobA", SourceSizeGB: 50 })];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 25 }),
    ];
    expect(calculateWeightedChangeRate(jobs, sessions)).toBeCloseTo(25, 1);
  });
});

describe("getMaxRetentionDays", () => {
  it("returns max RetainDays from jobs", () => {
    const jobs: SafeJob[] = [
      makeJob({ RetainDays: 7 }),
      makeJob({ RetainDays: 14 }),
      makeJob({ RetainDays: 8 }),
    ];
    expect(getMaxRetentionDays(jobs)).toBe(14);
  });

  it("skips null RetainDays", () => {
    const jobs: SafeJob[] = [
      makeJob({ RetainDays: 7 }),
      makeJob({ RetainDays: null }),
      makeJob({ RetainDays: 14 }),
    ];
    expect(getMaxRetentionDays(jobs)).toBe(14);
  });

  it("skips default null RetainDays from helper", () => {
    const jobs: SafeJob[] = [
      makeJob({ RetainDays: 7 }),
      makeJob({}), // uses default RetainDays: null
    ];
    expect(getMaxRetentionDays(jobs)).toBe(7);
  });

  it("returns null for empty array", () => {
    expect(getMaxRetentionDays([])).toBeNull();
  });

  it("returns null when all RetainDays are null", () => {
    const jobs: SafeJob[] = [
      makeJob({ RetainDays: null }),
      makeJob({ RetainDays: null }),
    ];
    expect(getMaxRetentionDays(jobs)).toBeNull();
  });

  it("handles single job", () => {
    const jobs: SafeJob[] = [makeJob({ RetainDays: 30 })];
    expect(getMaxRetentionDays(jobs)).toBe(30);
  });
});

describe("parseGfsDetails", () => {
  it("parses full GFS string with all three types", () => {
    expect(parseGfsDetails("Weekly:1,Monthly:1,Yearly:2")).toEqual({
      weekly: 1,
      monthly: 1,
      yearly: 2,
    });
  });

  it("parses partial GFS string with only Weekly and Monthly", () => {
    expect(parseGfsDetails("Weekly:1,Monthly:1")).toEqual({
      weekly: 1,
      monthly: 1,
      yearly: null,
    });
  });

  it("parses single GFS type", () => {
    expect(parseGfsDetails("Weekly:1")).toEqual({
      weekly: 1,
      monthly: null,
      yearly: null,
    });
  });

  it("handles null input", () => {
    expect(parseGfsDetails(null)).toEqual({
      weekly: null,
      monthly: null,
      yearly: null,
    });
  });

  it("handles empty string", () => {
    expect(parseGfsDetails("")).toEqual({
      weekly: null,
      monthly: null,
      yearly: null,
    });
  });

  it("handles invalid numbers", () => {
    expect(parseGfsDetails("Weekly:abc,Monthly:2")).toEqual({
      weekly: null,
      monthly: 2,
      yearly: null,
    });
  });

  it("handles whitespace in input", () => {
    expect(parseGfsDetails("Weekly:1, Monthly:2")).toEqual({
      weekly: 1,
      monthly: 2,
      yearly: null,
    });
  });

  it("is case-insensitive for keys", () => {
    expect(parseGfsDetails("weekly:1,monthly:2,yearly:3")).toEqual({
      weekly: 1,
      monthly: 2,
      yearly: 3,
    });
  });

  it("handles zero values", () => {
    expect(parseGfsDetails("Weekly:0,Monthly:0")).toEqual({
      weekly: 0,
      monthly: 0,
      yearly: null,
    });
  });

  it("handles malformed pairs gracefully", () => {
    expect(parseGfsDetails("Weekly,Monthly:2")).toEqual({
      weekly: null,
      monthly: 2,
      yearly: null,
    });
  });
});

describe("aggregateGfsMax", () => {
  it("finds max of each GFS type across jobs", () => {
    const jobs: SafeJob[] = [
      makeJob({ GfsDetails: "Weekly:1,Monthly:1" }),
      makeJob({ GfsDetails: "Weekly:2,Monthly:3,Yearly:1" }),
      makeJob({ GfsDetails: "Weekly:1,Yearly:2" }),
    ];
    expect(aggregateGfsMax(jobs)).toEqual({
      weekly: 2,
      monthly: 3,
      yearly: 2,
    });
  });

  it("skips jobs with null GfsDetails", () => {
    const jobs: SafeJob[] = [
      makeJob({ GfsDetails: "Weekly:1,Monthly:1" }),
      makeJob({ GfsDetails: null }),
      makeJob({ GfsDetails: "Weekly:3" }),
    ];
    expect(aggregateGfsMax(jobs)).toEqual({
      weekly: 3,
      monthly: 1,
      yearly: null,
    });
  });

  it("skips jobs with empty GfsDetails", () => {
    const jobs: SafeJob[] = [
      makeJob({ GfsDetails: "" }),
      makeJob({ GfsDetails: "Monthly:5" }),
    ];
    expect(aggregateGfsMax(jobs)).toEqual({
      weekly: null,
      monthly: 5,
      yearly: null,
    });
  });

  it("skips default null GfsDetails from helper", () => {
    const jobs: SafeJob[] = [
      makeJob({}), // uses default GfsDetails: null
      makeJob({ GfsDetails: "Yearly:4" }),
    ];
    expect(aggregateGfsMax(jobs)).toEqual({
      weekly: null,
      monthly: null,
      yearly: 4,
    });
  });

  it("returns all null for empty array", () => {
    expect(aggregateGfsMax([])).toEqual({
      weekly: null,
      monthly: null,
      yearly: null,
    });
  });

  it("returns all null when no jobs have GFS data", () => {
    const jobs: SafeJob[] = [
      makeJob({ GfsDetails: null }),
      makeJob({ GfsDetails: "" }),
    ];
    expect(aggregateGfsMax(jobs)).toEqual({
      weekly: null,
      monthly: null,
      yearly: null,
    });
  });
});

describe("buildCalculatorSummary", () => {
  it("returns complete CalculatorSummary from jobs and sessions", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobA",
        RetainDays: 7,
        GfsDetails: "Weekly:1,Monthly:1",
        SourceSizeGB: 6.656,
      }),
      makeJob({
        JobName: "JobB",
        RetainDays: 14,
        GfsDetails: "Weekly:2,Yearly:1",
        SourceSizeGB: 8.3968,
      }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", AvgChangeRate: 66.15 }),
      makeSession({ JobName: "JobB", AvgChangeRate: 1.43 }),
    ];

    const result = buildCalculatorSummary(jobs, sessions);

    expect(result.totalSourceDataTB).toBeCloseTo(0.0147, 4);
    expect(result.weightedAvgChangeRate).toBeCloseTo(
      (6.656 * 66.15 + 8.3968 * 1.43) / (6.656 + 8.3968),
      1,
    );
    expect(result.immutabilityDays).toBe(30);
    expect(result.maxRetentionDays).toBe(30);
    expect(result.originalMaxRetentionDays).toBe(14);
    expect(result.gfsWeekly).toBe(2);
    expect(result.gfsMonthly).toBe(1);
    expect(result.gfsYearly).toBe(1);
  });

  it("returns all nulls with hardcoded immutability for empty inputs", () => {
    const result = buildCalculatorSummary([], []);

    const expected: CalculatorSummary = {
      totalSourceDataTB: null,
      weightedAvgChangeRate: null,
      immutabilityDays: 30,
      maxRetentionDays: 30,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
    };
    expect(result).toEqual(expected);
  });

  it("handles jobs with no GFS and sessions with no data", () => {
    const jobs: SafeJob[] = [makeJob({ RetainDays: 7 })];
    const sessions: SafeJobSession[] = [makeSession({ MaxDataSize: null })];

    const result = buildCalculatorSummary(jobs, sessions);

    expect(result.totalSourceDataTB).toBeNull();
    expect(result.weightedAvgChangeRate).toBeNull();
    expect(result.immutabilityDays).toBe(30);
    expect(result.maxRetentionDays).toBe(30);
    expect(result.originalMaxRetentionDays).toBe(7);
    expect(result.gfsWeekly).toBeNull();
    expect(result.gfsMonthly).toBeNull();
    expect(result.gfsYearly).toBeNull();
  });

  it("always sets immutabilityDays to 30", () => {
    const result = buildCalculatorSummary(
      [makeJob({ RetainDays: 365 })],
      [makeSession({ MaxDataSize: 100 })],
    );
    expect(result.immutabilityDays).toBe(30);
  });

  describe("buildCalculatorSummary retention floor", () => {
    it("applies 30-day floor when max retention is 14 days", () => {
      const jobs: SafeJob[] = [makeJob({ RetainDays: 14 })];
      const result = buildCalculatorSummary(jobs, []);

      expect(result.maxRetentionDays).toBe(30);
      expect(result.originalMaxRetentionDays).toBe(14);
    });

    it("preserves max retention when above 30 days", () => {
      const jobs: SafeJob[] = [makeJob({ RetainDays: 45 })];
      const result = buildCalculatorSummary(jobs, []);

      expect(result.maxRetentionDays).toBe(45);
      expect(result.originalMaxRetentionDays).toBe(45);
    });

    it("applies 30-day floor when all jobs have null RetainDays", () => {
      const jobs: SafeJob[] = [
        makeJob({ RetainDays: null }),
        makeJob({ RetainDays: null }),
      ];
      const result = buildCalculatorSummary(jobs, []);

      expect(result.maxRetentionDays).toBe(30);
      expect(result.originalMaxRetentionDays).toBeNull();
    });

    it("applies 30-day floor when max retention is 0 days", () => {
      const jobs: SafeJob[] = [makeJob({ RetainDays: 0 })];
      const result = buildCalculatorSummary(jobs, []);

      expect(result.maxRetentionDays).toBe(30);
      expect(result.originalMaxRetentionDays).toBe(0);
    });

    it("preserves max retention when exactly 30 days", () => {
      const jobs: SafeJob[] = [makeJob({ RetainDays: 30 })];
      const result = buildCalculatorSummary(jobs, []);

      expect(result.maxRetentionDays).toBe(30);
      expect(result.originalMaxRetentionDays).toBe(30);
    });
  });
});

describe("buildCalculatorSummary with GlobalSettings retention cap", () => {
  it("is a no-op when limitCalculationYears is null", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Job A",
        SourceSizeGB: 1024,
        RetainDays: 60,
        GfsDetails: "Weekly:60,Monthly:18,Yearly:7",
      }),
    ];
    const baseline = buildCalculatorSummary(jobs, []);
    const withSettings = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ limitCalculationYears: null }),
    );
    expect(withSettings).toEqual(baseline);
  });

  it("caps yearly, monthly, weekly, and RetainDays to the time horizon", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Job A",
        RetainDays: 500,
        GfsDetails: "Weekly:60,Monthly:18,Yearly:7",
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ limitCalculationYears: 1 }),
    );

    expect(result.gfsYearly).toBe(1); // 7 → cap 1
    expect(result.gfsMonthly).toBe(12); // 18 → cap 12
    expect(result.gfsWeekly).toBe(52); // 60 → cap 52
    expect(result.originalMaxRetentionDays).toBe(365); // 500 → cap 365
    expect(result.maxRetentionDays).toBe(365);
  });

  it("leaves values below the cap untouched", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Job A",
        RetainDays: 90,
        GfsDetails: "Weekly:4,Monthly:6,Yearly:1",
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ limitCalculationYears: 2 }),
    );

    // limit 2y → caps: yearly 2, monthly 24, weekly 104, daily 730 — all above source values
    expect(result.gfsYearly).toBe(1);
    expect(result.gfsMonthly).toBe(6);
    expect(result.gfsWeekly).toBe(4);
    expect(result.originalMaxRetentionDays).toBe(90);
  });

  it("applies caps per-job before aggregation across mixed jobs", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Big",
        RetainDays: 500,
        GfsDetails: "Weekly:200,Monthly:48,Yearly:10",
      }),
      makeJob({
        JobName: "Small",
        RetainDays: 30,
        GfsDetails: "Weekly:2,Monthly:6,Yearly:1",
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ limitCalculationYears: 1 }),
    );

    expect(result.gfsYearly).toBe(1); // max(min(10,1), min(1,1)) = 1
    expect(result.gfsMonthly).toBe(12); // max(min(48,12), min(6,12)) = 12
    expect(result.gfsWeekly).toBe(52); // max(min(200,52), min(2,52)) = 52
    expect(result.originalMaxRetentionDays).toBe(365); // max(min(500,365), min(30,365)) = 365
  });

  it("does not crash on jobs with null GfsDetails or RetainDays", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "Empty", RetainDays: null, GfsDetails: null }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ limitCalculationYears: 1 }),
    );

    expect(result.originalMaxRetentionDays).toBeNull();
    expect(result.gfsWeekly).toBeNull();
    expect(result.gfsMonthly).toBeNull();
    expect(result.gfsYearly).toBeNull();
  });

  it("caps using months only when limitCalculationYears is 0 and months > 0", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "MonthsOnly",
        RetainDays: 500,
        GfsDetails: "Weekly:60,Monthly:18,Yearly:7",
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({
        limitCalculationYears: 0,
        limitCalculationMonths: 6,
      }),
    );

    // globalCapDays = 0*365 + 6*30 = 180
    expect(result.originalMaxRetentionDays).toBe(180);
    expect(result.maxRetentionDays).toBe(180);
    // floor(180/7) = 25
    expect(result.gfsWeekly).toBe(25);
    // floor(180/30) = 6 — symmetric with the 30-day-month input convention
    expect(result.gfsMonthly).toBe(6);
    // floor(180/365) = 0
    expect(result.gfsYearly).toBe(0);
  });

  it("caps a 3-month limit to 3 monthly slots, not 2 (symmetric 30-day-month convention)", () => {
    // Regression: floor(90*12/365) = 2, but floor(90/30) = 3.
    // Weekly + monthly retention coexist on the Vault — they aren't summed —
    // so a 3-month cap should retain 3 monthly slots alongside the weeklies.
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "ShortCap",
        RetainDays: 365,
        GfsDetails: "Weekly:4,Monthly:12,Yearly:7",
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({
        limitCalculationYears: 0,
        limitCalculationMonths: 3,
      }),
    );

    expect(result.gfsWeekly).toBe(4); // min(4, floor(90/7)=12) = 4
    expect(result.gfsMonthly).toBe(3); // min(12, floor(90/30)=3) = 3
    expect(result.gfsYearly).toBe(0); // min(7, 0) = 0
    expect(result.originalMaxRetentionDays).toBe(90);
  });

  it("caps using years and months combined", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Mixed",
        RetainDays: 5000,
        GfsDetails: "Weekly:300,Monthly:48,Yearly:10",
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({
        limitCalculationYears: 2,
        limitCalculationMonths: 6,
      }),
    );

    // globalCapDays = 2*365 + 6*30 = 910
    expect(result.originalMaxRetentionDays).toBe(910);
    // floor(910/7) = 130
    expect(result.gfsWeekly).toBe(130);
    // floor(910/30) = 30 (matches 2y*12 + 6m = 30 monthly slots)
    expect(result.gfsMonthly).toBe(30);
    // floor(910/365) = 2
    expect(result.gfsYearly).toBe(2);
  });

  it("ignores the cap when toggle is on but both years and months are 0", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Job A",
        RetainDays: 500,
        GfsDetails: "Weekly:60,Monthly:18,Yearly:7",
      }),
    ];
    const baseline = buildCalculatorSummary(jobs, []);
    const withZeroCap = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({
        limitCalculationYears: 0,
        limitCalculationMonths: 0,
      }),
    );
    expect(withZeroCap).toEqual(baseline);
  });
});

describe("buildCalculatorSummary with archive tier truncation", () => {
  it("truncates GFS but leaves RetainDays untouched when archiveOffloadDays is set", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobArchive",
        RetainDays: 90,
        GfsDetails: "Weekly:8,Monthly:6,Yearly:2",
        archiveOffloadDays: 28,
      }),
    ];
    const result = buildCalculatorSummary(jobs, [], new Set(), makeSettings());

    // RetainDays untouched — archive cap NEVER applies to daily retention
    expect(result.originalMaxRetentionDays).toBe(90);
    // GFS capped by 28-day offload: floor(28/365)=0, floor(28/30)=0, floor(28/7)=4
    expect(result.gfsWeekly).toBe(4);
    expect(result.gfsMonthly).toBe(0);
    expect(result.gfsYearly).toBe(0);
  });

  it("bypasses archive truncation when ignoreArchiveTier is true", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobArchive",
        RetainDays: 90,
        GfsDetails: "Weekly:8,Monthly:6,Yearly:2",
        archiveOffloadDays: 28,
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ ignoreArchiveTier: true }),
    );

    expect(result.originalMaxRetentionDays).toBe(90);
    expect(result.gfsWeekly).toBe(8);
    expect(result.gfsMonthly).toBe(6);
    expect(result.gfsYearly).toBe(2);
  });

  it("combines global cap and archive cap — archive wins on GFS, global on daily", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobArchive",
        RetainDays: 90,
        GfsDetails: "Weekly:8,Monthly:6,Yearly:2",
        archiveOffloadDays: 28,
      }),
    ];
    const result = buildCalculatorSummary(
      jobs,
      [],
      new Set(),
      makeSettings({ limitCalculationYears: 5 }),
    );

    // Daily cap = 5*365 = 1825; min(90, 1825) = 90
    expect(result.originalMaxRetentionDays).toBe(90);
    // GFS cap = min(1825, 28) = 28 → same as archive-only case
    expect(result.gfsWeekly).toBe(4);
    expect(result.gfsMonthly).toBe(0);
    expect(result.gfsYearly).toBe(0);
  });

  it("leaves jobs without archiveOffloadDays untouched", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobNoArchive",
        RetainDays: 90,
        GfsDetails: "Weekly:8,Monthly:6,Yearly:2",
      }),
    ];
    const result = buildCalculatorSummary(jobs, [], new Set(), makeSettings());

    expect(result.originalMaxRetentionDays).toBe(90);
    expect(result.gfsWeekly).toBe(8);
    expect(result.gfsMonthly).toBe(6);
    expect(result.gfsYearly).toBe(2);
  });

  it("handles null RetainDays and null GfsDetails with archiveOffloadDays", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobEmptyArchive",
        RetainDays: null,
        GfsDetails: null,
        archiveOffloadDays: 14,
      }),
    ];
    const result = buildCalculatorSummary(jobs, [], new Set(), makeSettings());

    expect(result.originalMaxRetentionDays).toBeNull();
    expect(result.gfsWeekly).toBeNull();
    expect(result.gfsMonthly).toBeNull();
    expect(result.gfsYearly).toBeNull();
  });

  it("aggregates correctly across mixed archive and non-archive jobs", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "Archived",
        RetainDays: 60,
        GfsDetails: "Weekly:10,Monthly:6,Yearly:3",
        archiveOffloadDays: 28,
      }),
      makeJob({
        JobName: "NotArchived",
        RetainDays: 90,
        GfsDetails: "Weekly:4,Monthly:2,Yearly:1",
      }),
    ];
    const result = buildCalculatorSummary(jobs, [], new Set(), makeSettings());

    // GFS aggregated max (28-day archive cap → wMax=4, mMax=0, yMax=0):
    //   weekly: max(min(10,4), 4) = 4
    //   monthly: max(min(6,0), 2) = 2
    //   yearly: max(min(3,0), 1) = 1
    expect(result.gfsWeekly).toBe(4);
    expect(result.gfsMonthly).toBe(2);
    expect(result.gfsYearly).toBe(1);
    // Daily untouched in both
    expect(result.originalMaxRetentionDays).toBe(90);
  });
});

describe("buildCalculatorSummary with exclusions", () => {
  it("excludes jobs by name from all aggregations", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "Job A", SourceSizeGB: 1024, RetainDays: 14 }),
      makeJob({ JobName: "Job B", SourceSizeGB: 1024, RetainDays: 60 }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "Job A", AvgChangeRate: 10 }),
      makeSession({ JobName: "Job B", AvgChangeRate: 20 }),
    ];
    const excluded = new Set(["Job B"]);
    const summary = buildCalculatorSummary(jobs, sessions, excluded);
    // Only Job A: 1024 GB = 1 TB
    expect(summary.totalSourceDataTB).toBeCloseTo(1.0, 4);
    // Only Job A change rate
    expect(summary.weightedAvgChangeRate).toBeCloseTo(10, 1);
    // Job A retention = 14, but minimum is 30
    expect(summary.maxRetentionDays).toBe(30);
  });

  it("returns full aggregation when excluded set is empty", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "Job A", SourceSizeGB: 512 }),
      makeJob({ JobName: "Job B", SourceSizeGB: 512 }),
    ];
    const summary = buildCalculatorSummary(jobs, [], new Set());
    expect(summary.totalSourceDataTB).toBeCloseTo(1.0, 4);
  });

  it("handles undefined excluded set (backward compat)", () => {
    const jobs: SafeJob[] = [makeJob({ SourceSizeGB: 1024 })];
    const summary = buildCalculatorSummary(jobs, []);
    expect(summary.totalSourceDataTB).toBeCloseTo(1.0, 4);
  });
});

describe("buildCalculatorSummary sourceDataBreakdown", () => {
  it("groups source TB by JobType and sorts descending", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobA",
        JobType: "VMware Backup",
        SourceSizeGB: 200,
      }),
      makeJob({
        JobName: "JobB",
        JobType: "VMware Backup",
        SourceSizeGB: 100,
      }),
      makeJob({
        JobName: "JobC",
        JobType: "Agent Backup",
        SourceSizeGB: 1024,
      }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.sourceDataBreakdown).toHaveLength(2);
    expect(result.sourceDataBreakdown[0].type).toBe("Agent Backup");
    expect(result.sourceDataBreakdown[0].tb).toBeCloseTo(1.0, 4);
    expect(result.sourceDataBreakdown[1].type).toBe("VMware Backup");
    expect(result.sourceDataBreakdown[1].tb).toBeCloseTo(300 / 1024, 4);
  });

  it("buckets jobs with empty JobType under 'Unknown'", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", JobType: "", SourceSizeGB: 1024 }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.sourceDataBreakdown).toEqual([{ type: "Unknown", tb: 1.0 }]);
  });

  it("skips jobs with null SourceSizeGB", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobA",
        JobType: "VMware Backup",
        SourceSizeGB: null,
      }),
      makeJob({ JobName: "JobB", JobType: "Agent Backup", SourceSizeGB: 512 }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.sourceDataBreakdown).toHaveLength(1);
    expect(result.sourceDataBreakdown[0].type).toBe("Agent Backup");
  });

  it("returns an empty array when no jobs report SourceSizeGB", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA", SourceSizeGB: null }),
      makeJob({ JobName: "JobB", SourceSizeGB: null }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.sourceDataBreakdown).toEqual([]);
  });

  it("respects exclusions when building the breakdown", () => {
    const jobs: SafeJob[] = [
      makeJob({
        JobName: "JobA",
        JobType: "VMware Backup",
        SourceSizeGB: 1024,
      }),
      makeJob({
        JobName: "JobB",
        JobType: "Agent Backup",
        SourceSizeGB: 1024,
      }),
    ];

    const result = buildCalculatorSummary(jobs, [], new Set(["JobB"]));

    expect(result.sourceDataBreakdown).toHaveLength(1);
    expect(result.sourceDataBreakdown[0].type).toBe("VMware Backup");
  });
});

describe("buildCalculatorSummary gfsDistribution", () => {
  it("counts jobs by formatted GFS policy and sorts descending by count", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", GfsDetails: "Weekly:4,Yearly:1" }),
      makeJob({ JobName: "B", GfsDetails: "Weekly:4,Yearly:1" }),
      makeJob({ JobName: "C", GfsDetails: "Weekly:4,Yearly:1" }),
      makeJob({ JobName: "D", GfsDetails: "Monthly:12" }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.gfsDistribution).toEqual([
      { policy: "4W | 1Y", count: 3 },
      { policy: "12M", count: 1 },
    ]);
  });

  it("skips jobs with null GfsDetails", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", GfsDetails: null }),
      makeJob({ JobName: "B", GfsDetails: "Weekly:4" }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.gfsDistribution).toEqual([{ policy: "4W", count: 1 }]);
  });

  it("returns an empty array when no jobs configure GFS", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", GfsDetails: null }),
      makeJob({ JobName: "B", GfsDetails: null }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.gfsDistribution).toEqual([]);
  });

  it("uses capped GFS values from the limitCalculationYears setting", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", GfsDetails: "Yearly:10" }),
    ];
    const settings = makeSettings({ limitCalculationYears: 5 });

    const result = buildCalculatorSummary(jobs, [], new Set(), settings);

    expect(result.gfsDistribution).toEqual([{ policy: "5Y", count: 1 }]);
  });
});

describe("buildCalculatorSummary retentionDistribution", () => {
  it("counts jobs by RetainDays and sorts descending by count", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", RetainDays: 14 }),
      makeJob({ JobName: "B", RetainDays: 14 }),
      makeJob({ JobName: "C", RetainDays: 14 }),
      makeJob({ JobName: "D", RetainDays: 30 }),
      makeJob({ JobName: "E", RetainDays: 7 }),
      makeJob({ JobName: "F", RetainDays: 7 }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.retentionDistribution).toEqual([
      { days: 14, count: 3 },
      { days: 7, count: 2 },
      { days: 30, count: 1 },
    ]);
  });

  it("skips jobs with null RetainDays", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", RetainDays: null }),
      makeJob({ JobName: "B", RetainDays: 14 }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.retentionDistribution).toEqual([{ days: 14, count: 1 }]);
  });

  it("returns an empty array when all jobs have null RetainDays", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", RetainDays: null }),
      makeJob({ JobName: "B", RetainDays: null }),
    ];

    const result = buildCalculatorSummary(jobs, []);

    expect(result.retentionDistribution).toEqual([]);
  });

  it("uses capped RetainDays from the limitCalculationYears setting", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "A", RetainDays: 500 }),
      makeJob({ JobName: "B", RetainDays: 500 }),
      makeJob({ JobName: "C", RetainDays: 30 }),
    ];
    const settings = makeSettings({ limitCalculationYears: 1 });

    const result = buildCalculatorSummary(jobs, [], new Set(), settings);

    expect(result.retentionDistribution).toEqual([
      { days: 365, count: 2 },
      { days: 30, count: 1 },
    ]);
  });
});
