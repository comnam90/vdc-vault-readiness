import { describe, it, expect } from "vitest";
import type {
  SafeJob,
  SafeJobSession,
  NormalizedDataset,
} from "@/types/domain";
import type { CalculatorSummary } from "@/types/calculator";

describe("Domain Types - SafeJob extension", () => {
  it("SafeJob accepts RetainDays as number | null field", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: 30,
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
    };
    expect(job.RetainDays).toBe(30);
  });

  it("SafeJob accepts RetainDays as null", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
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
    };
    expect(job.RetainDays).toBeNull();
  });

  it("SafeJob accepts GfsDetails as string | null field", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: null,
      GfsDetails: "Weekly: 4, Monthly: 12, Yearly: 5",
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
    };
    expect(job.GfsDetails).toBe("Weekly: 4, Monthly: 12, Yearly: 5");
  });

  it("SafeJob accepts GfsDetails as null", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
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
    };
    expect(job.GfsDetails).toBeNull();
  });

  it("SafeJob preserves existing fields when new fields are added", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: 30,
      GfsDetails: "Weekly: 4",
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
    };
    expect(job.JobName).toBe("Test Job");
    expect(job.JobType).toBe("Backup");
    expect(job.Encrypted).toBe(true);
    expect(job.RepoName).toBe("Repo1");
  });

  it("SafeJob fields are no longer optional - must provide RetainDays and GfsDetails", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
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
    };
    // All fields are now required, can accept null
    expect(job).toBeDefined();
  });

  it("SafeJob accepts OnDiskGB as number", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: null,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: 512.5,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: null,
      ActiveFullEnabled: null,
      SyntheticFullEnabled: null,
      BackupChainType: null,
      IndexingEnabled: null,
    };
    expect(job.OnDiskGB).toBe(512.5);
  });

  it("SafeJob accepts OnDiskGB as null", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
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
    };
    expect(job.OnDiskGB).toBeNull();
  });

  it("SafeJob accepts GfsEnabled as boolean", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: null,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: null,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: true,
      ActiveFullEnabled: null,
      SyntheticFullEnabled: null,
      BackupChainType: null,
      IndexingEnabled: null,
    };
    expect(job.GfsEnabled).toBe(true);
  });

  it("SafeJob accepts GfsEnabled as null", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
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
    };
    expect(job.GfsEnabled).toBeNull();
  });

  it("SafeJob accepts string fields RetentionScheme, CompressionLevel, BlockSize, BackupChainType", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: null,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: null,
      RetentionScheme: "Days",
      CompressionLevel: "Optimal",
      BlockSize: "1 MB",
      GfsEnabled: null,
      ActiveFullEnabled: null,
      SyntheticFullEnabled: null,
      BackupChainType: "Forward Incremental",
      IndexingEnabled: null,
    };
    expect(job.RetentionScheme).toBe("Days");
    expect(job.CompressionLevel).toBe("Optimal");
    expect(job.BlockSize).toBe("1 MB");
    expect(job.BackupChainType).toBe("Forward Incremental");
  });

  it("SafeJob accepts boolean fields ActiveFullEnabled, SyntheticFullEnabled, IndexingEnabled", () => {
    const job: SafeJob = {
      JobName: "Test Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: null,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: null,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: null,
      ActiveFullEnabled: false,
      SyntheticFullEnabled: true,
      BackupChainType: null,
      IndexingEnabled: false,
    };
    expect(job.ActiveFullEnabled).toBe(false);
    expect(job.SyntheticFullEnabled).toBe(true);
    expect(job.IndexingEnabled).toBe(false);
  });
});

describe("Domain Types - SafeJobSession", () => {
  it("SafeJobSession interface has JobName required field", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: 1024,
      AvgChangeRate: 5.5,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.JobName).toBe("Test Job");
  });

  it("SafeJobSession accepts MaxDataSize as number | null", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: 2048,
      AvgChangeRate: 5.5,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.MaxDataSize).toBe(2048);
  });

  it("SafeJobSession accepts MaxDataSize as null", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: 5.5,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.MaxDataSize).toBeNull();
  });

  it("SafeJobSession accepts AvgChangeRate as number | null (percentage)", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: 1024,
      AvgChangeRate: 12.75,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.AvgChangeRate).toBe(12.75);
  });

  it("SafeJobSession accepts AvgChangeRate as null", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: 1024,
      AvgChangeRate: null,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.AvgChangeRate).toBeNull();
  });

  it("SafeJobSession requires JobName field", () => {
    const session: SafeJobSession = {
      JobName: "Required Job",
      MaxDataSize: null,
      AvgChangeRate: null,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.JobName).toBeDefined();
  });

  it("SafeJobSession accepts SuccessRate as number", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: null,
      SuccessRate: 100,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.SuccessRate).toBe(100);
  });

  it("SafeJobSession accepts SuccessRate as null", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: null,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.SuccessRate).toBeNull();
  });

  it("SafeJobSession accepts SessionCount and Fails as numbers", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: null,
      SuccessRate: null,
      SessionCount: 8,
      Fails: 1,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.SessionCount).toBe(8);
    expect(session.Fails).toBe(1);
  });

  it("SafeJobSession accepts AvgJobTime and MaxJobTime as strings", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: null,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: "00.08:01:24",
      MaxJobTime: "00.09:23:18",
    };
    expect(session.AvgJobTime).toBe("00.08:01:24");
    expect(session.MaxJobTime).toBe("00.09:23:18");
  });

  it("SafeJobSession accepts AvgJobTime and MaxJobTime as null", () => {
    const session: SafeJobSession = {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: null,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    };
    expect(session.AvgJobTime).toBeNull();
    expect(session.MaxJobTime).toBeNull();
  });
});

describe("Domain Types - NormalizedDataset extension", () => {
  it("NormalizedDataset includes jobSessionSummary array", () => {
    const dataset: NormalizedDataset = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
      jobSessionSummary: [
        {
          JobName: "Job A",
          MaxDataSize: 1024,
          AvgChangeRate: 5.0,
          SuccessRate: null,
          SessionCount: null,
          Fails: null,
          AvgJobTime: null,
          MaxJobTime: null,
        },
      ],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      dataErrors: [],
    };
    expect(dataset.jobSessionSummary).toBeDefined();
    expect(dataset.jobSessionSummary).toHaveLength(1);
  });

  it("NormalizedDataset jobSessionSummary accepts empty array", () => {
    const dataset: NormalizedDataset = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
      jobSessionSummary: [],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      dataErrors: [],
    };
    expect(dataset.jobSessionSummary).toEqual([]);
  });

  it("NormalizedDataset jobSessionSummary accepts multiple items", () => {
    const dataset: NormalizedDataset = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
      jobSessionSummary: [
        {
          JobName: "Job A",
          MaxDataSize: 1024,
          AvgChangeRate: 5.0,
          SuccessRate: null,
          SessionCount: null,
          Fails: null,
          AvgJobTime: null,
          MaxJobTime: null,
        },
        {
          JobName: "Job B",
          MaxDataSize: 2048,
          AvgChangeRate: 10.5,
          SuccessRate: null,
          SessionCount: null,
          Fails: null,
          AvgJobTime: null,
          MaxJobTime: null,
        },
      ],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      dataErrors: [],
    };
    expect(dataset.jobSessionSummary).toHaveLength(2);
  });

  it("NormalizedDataset preserves existing fields when jobSessionSummary is added", () => {
    const dataset: NormalizedDataset = {
      backupServer: [{ Version: "13.0", Name: "Server1" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: true,
          ConfigBackupEncryptionEnabled: false,
        },
      ],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: true,
          RepoName: "Repo1",
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
        },
      ],
      Licenses: [{ Edition: "Enterprise", Status: "Active" }],
      jobSessionSummary: [],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      dataErrors: [],
    };
    expect(dataset.backupServer).toHaveLength(1);
    expect(dataset.jobInfo).toHaveLength(1);
  });
});

describe("Calculator Types - CalculatorSummary", () => {
  it("CalculatorSummary has totalSourceDataTB as nullable number", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: 100.5,
      weightedAvgChangeRate: 10.0,
      immutabilityDays: 30,
      maxRetentionDays: 365,
      originalMaxRetentionDays: 365,
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 5,
    };
    expect(summary.totalSourceDataTB).toBe(100.5);
  });

  it("CalculatorSummary accepts totalSourceDataTB as null", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: null,
      weightedAvgChangeRate: 10.0,
      immutabilityDays: 30,
      maxRetentionDays: null,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    expect(summary.totalSourceDataTB).toBeNull();
  });

  it("CalculatorSummary has weightedAvgChangeRate as nullable number", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: 100.5,
      weightedAvgChangeRate: 15.75,
      immutabilityDays: 30,
      maxRetentionDays: 365,
      originalMaxRetentionDays: 365,
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 5,
    };
    expect(summary.weightedAvgChangeRate).toBe(15.75);
  });

  it("CalculatorSummary requires immutabilityDays as number (always 30 for MVP)", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: 100.5,
      weightedAvgChangeRate: 10.0,
      immutabilityDays: 30,
      maxRetentionDays: 365,
      originalMaxRetentionDays: 365,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    expect(summary.immutabilityDays).toBe(30);
  });

  it("CalculatorSummary has maxRetentionDays as nullable number", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: 100.5,
      weightedAvgChangeRate: 10.0,
      immutabilityDays: 30,
      maxRetentionDays: 1095,
      originalMaxRetentionDays: 1095,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    expect(summary.maxRetentionDays).toBe(1095);
  });

  it("CalculatorSummary has GFS fields as nullable number", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: 100.5,
      weightedAvgChangeRate: 10.0,
      immutabilityDays: 30,
      maxRetentionDays: 365,
      originalMaxRetentionDays: 365,
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 5,
    };
    expect(summary.gfsWeekly).toBe(4);
    expect(summary.gfsMonthly).toBe(12);
    expect(summary.gfsYearly).toBe(5);
  });

  it("CalculatorSummary accepts all GFS fields as null", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: null,
      weightedAvgChangeRate: null,
      immutabilityDays: 30,
      maxRetentionDays: null,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    expect(summary.gfsWeekly).toBeNull();
    expect(summary.gfsMonthly).toBeNull();
    expect(summary.gfsYearly).toBeNull();
  });

  it("CalculatorSummary has all required and nullable fields", () => {
    const summary: CalculatorSummary = {
      totalSourceDataTB: 250.0,
      weightedAvgChangeRate: 12.5,
      immutabilityDays: 30,
      maxRetentionDays: 730,
      originalMaxRetentionDays: 730,
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 7,
    };
    expect(summary).toBeDefined();
    expect(Object.keys(summary)).toHaveLength(8);
  });
});
