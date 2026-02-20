import { describe, it, expect } from "vitest";
import type { SafeJob } from "@/types/domain";
import {
  deriveStandardRepos,
  aggregateRepoStatsMap,
} from "@/lib/repo-aggregator";

function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "Test Job",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
    OnDiskGB: null,
    RetentionScheme: null,
    CompressionLevel: null,
    BlockSize: null,
    GfsEnabled: null,
    ActiveFullEnabled: null,
    SyntheticFullEnabled: null,
    BackupChainType: null,
    IndexingEnabled: null,
    ...overrides,
  };
}

describe("deriveStandardRepos", () => {
  it("groups jobs by repo name and sums source TB", () => {
    const jobs: SafeJob[] = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024, Encrypted: true }),
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024, Encrypted: true }),
      makeJob({ RepoName: "Repo B", SourceSizeGB: 512, Encrypted: false }),
    ];
    const result = deriveStandardRepos(jobs);
    expect(result).toHaveLength(2);
    const repoA = result.find((r) => r.repoName === "Repo A");
    expect(repoA?.jobCount).toBe(2);
    expect(repoA?.totalSourceTB).toBeCloseTo(2.0, 4);
    expect(repoA?.allEncrypted).toBe(true);
    const repoB = result.find((r) => r.repoName === "Repo B");
    expect(repoB?.allEncrypted).toBe(false);
  });

  it("returns null totalSourceTB when all jobs have null SourceSizeGB", () => {
    const jobs = [makeJob({ RepoName: "Repo A", SourceSizeGB: null })];
    const result = deriveStandardRepos(jobs);
    expect(result[0].totalSourceTB).toBeNull();
  });

  it("returns empty array for empty input", () => {
    expect(deriveStandardRepos([])).toEqual([]);
  });

  it("sorts by totalSourceTB descending (nulls last)", () => {
    const jobs: SafeJob[] = [
      makeJob({ RepoName: "Small", SourceSizeGB: 100 }),
      makeJob({ RepoName: "Large", SourceSizeGB: 5000 }),
      makeJob({ RepoName: "Unknown", SourceSizeGB: null }),
    ];
    const result = deriveStandardRepos(jobs);
    expect(result[0].repoName).toBe("Large");
    expect(result[1].repoName).toBe("Small");
    expect(result[2].repoName).toBe("Unknown");
  });
});

describe("aggregateRepoStatsMap", () => {
  it("sums sourceTB and onDiskTB from all jobs", () => {
    const jobs = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024, OnDiskGB: 512 }),
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024, OnDiskGB: 256 }),
      makeJob({ RepoName: "Repo B", SourceSizeGB: 512, OnDiskGB: 128 }),
    ];
    const map = aggregateRepoStatsMap(jobs);
    expect(map.get("Repo A")?.sourceTB).toBeCloseTo(2.0, 4);
    expect(map.get("Repo A")?.onDiskTB).toBeCloseTo(0.75, 4);
    expect(map.get("Repo B")?.sourceTB).toBeCloseTo(0.5, 4);
  });

  it("filters to named repos when a Set is provided", () => {
    const jobs = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024 }),
      makeJob({ RepoName: "Repo B", SourceSizeGB: 512 }),
    ];
    const map = aggregateRepoStatsMap(jobs, new Set(["Repo B"]));
    expect(map.has("Repo A")).toBe(false);
    expect(map.get("Repo B")?.sourceTB).toBeCloseTo(0.5, 4);
  });

  it("treats null SourceSizeGB and OnDiskGB as 0", () => {
    const jobs = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: null, OnDiskGB: null }),
    ];
    const map = aggregateRepoStatsMap(jobs);
    expect(map.get("Repo A")?.sourceTB).toBe(0);
    expect(map.get("Repo A")?.onDiskTB).toBe(0);
  });

  it("returns empty map for empty input", () => {
    expect(aggregateRepoStatsMap([])).toEqual(new Map());
  });
});
