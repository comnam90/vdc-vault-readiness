import { describe, it, expect } from "vitest";
import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { EnrichedJob } from "@/types/enriched-job";
import { enrichJobs } from "@/lib/enrich-jobs";

function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "TestJob",
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

function makeSession(overrides: Partial<SafeJobSession> = {}): SafeJobSession {
  return {
    JobName: "TestJob",
    MaxDataSize: null,
    AvgChangeRate: null,
    SuccessRate: null,
    SessionCount: null,
    Fails: null,
    AvgJobTime: null,
    MaxJobTime: null,
    ...overrides,
  };
}

describe("enrichJobs", () => {
  it("returns empty array when jobs array is empty", () => {
    const jobs: SafeJob[] = [];
    const sessions: SafeJobSession[] = [];

    const result = enrichJobs(jobs, sessions);

    expect(result).toEqual([]);
  });

  it("returns jobs with null sessionData when sessions array is empty", () => {
    const jobs: SafeJob[] = [makeJob({ JobName: "Job1" })];
    const sessions: SafeJobSession[] = [];

    const result = enrichJobs(jobs, sessions);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      JobName: "Job1",
      sessionData: null,
    });
  });

  it("enriches jobs with matching session data", () => {
    const jobs: SafeJob[] = [makeJob({ JobName: "BackupJob" })];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "BackupJob", MaxDataSize: 5120 }),
    ];

    const result = enrichJobs(jobs, sessions);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      JobName: "BackupJob",
      sessionData: {
        JobName: "BackupJob",
        MaxDataSize: 5120,
      },
    });
  });

  it("sets sessionData to null when no matching session exists", () => {
    const jobs: SafeJob[] = [makeJob({ JobName: "UnmatchedJob" })];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "DifferentJob" }),
    ];

    const result = enrichJobs(jobs, sessions);

    expect(result).toHaveLength(1);
    expect(result[0].sessionData).toBeNull();
  });

  it("handles multiple jobs with partial session matches", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "Job1" }),
      makeJob({ JobName: "Job2" }),
      makeJob({ JobName: "Job3" }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "Job1", MaxDataSize: 1024 }),
      makeSession({ JobName: "Job3", AvgChangeRate: 2.5 }),
    ];

    const result = enrichJobs(jobs, sessions);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      JobName: "Job1",
      sessionData: { JobName: "Job1", MaxDataSize: 1024 },
    });
    expect(result[1]).toMatchObject({
      JobName: "Job2",
      sessionData: null,
    });
    expect(result[2]).toMatchObject({
      JobName: "Job3",
      sessionData: { JobName: "Job3", AvgChangeRate: 2.5 },
    });
  });

  it("preserves all SafeJob properties in enriched result", () => {
    const job: SafeJob = makeJob({
      JobName: "CompleteJob",
      JobType: "SQL Server",
      Encrypted: false,
      RepoName: "VeeamVault",
      RetainDays: 30,
      SourceSizeGB: 256,
    });
    const jobs: SafeJob[] = [job];
    const sessions: SafeJobSession[] = [];

    const result = enrichJobs(jobs, sessions);

    const enriched = result[0];
    expect(enriched).toMatchObject({
      JobName: "CompleteJob",
      JobType: "SQL Server",
      Encrypted: false,
      RepoName: "VeeamVault",
      RetainDays: 30,
      SourceSizeGB: 256,
      sessionData: null,
    });
  });

  it("extends SafeJob interface with sessionData property", () => {
    const jobs: SafeJob[] = [makeJob()];
    const sessions: SafeJobSession[] = [makeSession()];

    const result: EnrichedJob[] = enrichJobs(jobs, sessions);

    expect(result[0]).toHaveProperty("sessionData");
    expect(result[0]).toHaveProperty("JobName");
    expect(result[0]).toHaveProperty("Encrypted");
  });

  it("matches jobs by exact JobName string", () => {
    const jobs: SafeJob[] = [makeJob({ JobName: "ExactName" })];
    const sessions: SafeJobSession[] = [makeSession({ JobName: "ExactName" })];

    const result = enrichJobs(jobs, sessions);

    expect(result[0].sessionData?.JobName).toBe("ExactName");
  });

  it("does not match jobs with case-insensitive JobName", () => {
    const jobs: SafeJob[] = [makeJob({ JobName: "TestJob" })];
    const sessions: SafeJobSession[] = [makeSession({ JobName: "testjob" })];

    const result = enrichJobs(jobs, sessions);

    expect(result[0].sessionData).toBeNull();
  });

  it("handles multiple sessions for different jobs correctly", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "JobA" }),
      makeJob({ JobName: "JobB" }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "JobA", SessionCount: 10 }),
      makeSession({ JobName: "JobB", SessionCount: 20 }),
    ];

    const result = enrichJobs(jobs, sessions);

    expect(result[0]).toMatchObject({
      JobName: "JobA",
      sessionData: { JobName: "JobA", SessionCount: 10 },
    });
    expect(result[1]).toMatchObject({
      JobName: "JobB",
      sessionData: { JobName: "JobB", SessionCount: 20 },
    });
  });
});
