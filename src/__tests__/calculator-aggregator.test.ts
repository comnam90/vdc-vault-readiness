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

function makeSession(overrides: Partial<SafeJobSession> = {}): SafeJobSession {
  return {
    JobName: "TestJob",
    MaxDataSize: null,
    AvgChangeRate: null,
    ...overrides,
  };
}

function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "TestJob",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
    ...overrides,
  };
}

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
    expect(result.maxRetentionDays).toBe(14);
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
      maxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
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
    expect(result.maxRetentionDays).toBe(7);
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
});
