import { describe, it, expect } from "vitest";
import type {
  SafeJob,
  SafeJobSession,
  SafeRepo,
  SafeSobr,
} from "@/types/domain";
import {
  groupByJobType,
  bucketChangeRates,
  groupByRepo,
  repoImmutabilityCounts,
} from "@/lib/chart-selectors";
import { makeJob, makeRepo, makeSobr } from "./fixtures";

describe("groupByJobType", () => {
  it("sums source TB per job type, sorted descending", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobType: "VMware Backup", SourceSizeGB: 2048 }),
      makeJob({ JobType: "VMware Backup", SourceSizeGB: 1024 }),
      makeJob({ JobType: "Agent Backup", SourceSizeGB: 512 }),
    ];
    const result = groupByJobType(jobs);
    expect(result[0]).toEqual({
      jobType: "VMware Backup",
      totalTB: expect.closeTo(3.0, 2),
    });
    expect(result[1]).toEqual({
      jobType: "Agent Backup",
      totalTB: expect.closeTo(0.5, 2),
    });
  });

  it("excludes jobs with null SourceSizeGB from totals", () => {
    const jobs = [makeJob({ JobType: "VMware Backup", SourceSizeGB: null })];
    const result = groupByJobType(jobs);
    expect(result[0].totalTB).toBe(0);
  });
});

describe("bucketChangeRates", () => {
  it("places jobs into correct buckets", () => {
    const jobs = [
      makeJob({ JobName: "J1" }),
      makeJob({ JobName: "J2" }),
      makeJob({ JobName: "J3" }),
    ];
    const sessions: SafeJobSession[] = [
      {
        JobName: "J1",
        AvgChangeRate: 3,
        MaxDataSize: null,
        SuccessRate: null,
        SessionCount: null,
        Fails: null,
        AvgJobTime: null,
        MaxJobTime: null,
      },
      {
        JobName: "J2",
        AvgChangeRate: 12,
        MaxDataSize: null,
        SuccessRate: null,
        SessionCount: null,
        Fails: null,
        AvgJobTime: null,
        MaxJobTime: null,
      },
      {
        JobName: "J3",
        AvgChangeRate: 60,
        MaxDataSize: null,
        SuccessRate: null,
        SessionCount: null,
        Fails: null,
        AvgJobTime: null,
        MaxJobTime: null,
      },
    ];
    const result = bucketChangeRates(jobs, sessions);
    expect(result.find((b) => b.bucket === "0–5%")?.count).toBe(1);
    expect(result.find((b) => b.bucket === "5–10%")?.count).toBe(0);
    expect(result.find((b) => b.bucket === "10–25%")?.count).toBe(1);
    expect(result.find((b) => b.bucket === ">50%")?.count).toBe(1);
  });
});

describe("groupByRepo", () => {
  it("sums source TB per repo, sorted descending", () => {
    const jobs = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024 }),
      makeJob({ RepoName: "Repo B", SourceSizeGB: 2048 }),
    ];
    const result = groupByRepo(jobs);
    expect(result[0].repoName).toBe("Repo B");
    expect(result[1].repoName).toBe("Repo A");
  });
});

describe("repoImmutabilityCounts", () => {
  it("counts immutable vs non-immutable across repos and SOBR combined", () => {
    const repos: SafeRepo[] = [
      makeRepo({ ImmutabilitySupported: true }),
      makeRepo({ ImmutabilitySupported: false }),
    ];
    const sobr: SafeSobr[] = [makeSobr({ ImmutableEnabled: true })];
    const result = repoImmutabilityCounts(repos, sobr);
    expect(result.find((s) => s.name === "Immutable")?.count).toBe(2);
    expect(result.find((s) => s.name === "Not Immutable")?.count).toBe(1);
  });

  it("returns zeros for empty inputs", () => {
    const result = repoImmutabilityCounts([], []);
    expect(result.every((s) => s.count === 0)).toBe(true);
  });
});
