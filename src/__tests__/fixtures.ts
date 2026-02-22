import type {
  NormalizedDataset,
  SafeRepo,
  SafeJob,
  SafeJobSession,
  SafeSobr,
} from "@/types/domain";
import type { ValidationResult } from "@/types/validation";

/**
 * Shared test fixtures — import into test files instead of re-declaring.
 * Keep fixtures minimal; tests needing unique data should define it locally.
 */

export const MOCK_DATA: NormalizedDataset = {
  backupServer: [{ Version: "13.0.1.1071", Name: "VBR-01" }],
  securitySummary: [
    { BackupFileEncryptionEnabled: true, ConfigBackupEncryptionEnabled: true },
  ],
  jobInfo: [
    {
      JobName: "Job A",
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
    },
    {
      JobName: "Job B",
      JobType: "Agent Backup",
      Encrypted: false,
      RepoName: "WinLocal",
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
    {
      JobName: "Job C",
      JobType: "File Backup",
      Encrypted: true,
      RepoName: "VeeamVault",
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
  Licenses: [{ Edition: "Enterprise Plus", Status: "Active" }],
  jobSessionSummary: [],
  sobr: [],
  extents: [],
  capExtents: [],
  archExtents: [],
  repos: [
    {
      Name: "LinuxHardened",
      JobCount: 1,
      TotalSpaceTB: 2.0,
      FreeSpaceTB: 1.0,
      ImmutabilitySupported: true,
      Type: "LinuxLocal",
      Host: null,
      Path: null,
      MaxTasks: null,
      IsPerVmBackupFiles: null,
      IsDecompress: null,
      AlignBlocks: null,
      IsRotatedDrives: null,
      FreeSpacePercent: null,
    } satisfies SafeRepo,
  ],
  dataErrors: [],
};

export const PASS_RESULT: ValidationResult = {
  ruleId: "vbr-version",
  title: "VBR Version Compatibility",
  status: "pass",
  message: "All VBR servers meet the minimum version.",
  affectedItems: [],
};

export const FAIL_RESULT: ValidationResult = {
  ruleId: "job-encryption",
  title: "Job Encryption Audit",
  status: "fail",
  message: "Unencrypted jobs detected.",
  affectedItems: ["Job B"],
};

export const WARNING_RESULT: ValidationResult = {
  ruleId: "agent-workload",
  title: "Agent Workload Configuration",
  status: "warning",
  message: "Agent workloads detected.",
  affectedItems: ["Job B"],
};

export function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
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

export function makeSession(
  overrides: Partial<SafeJobSession> = {},
): SafeJobSession {
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

export function makeRepo(overrides: Partial<SafeRepo> = {}): SafeRepo {
  return {
    Name: "Repo",
    JobCount: null,
    TotalSpaceTB: null,
    FreeSpaceTB: null,
    ImmutabilitySupported: false,
    Type: null,
    Host: null,
    Path: null,
    MaxTasks: null,
    IsPerVmBackupFiles: null,
    IsDecompress: null,
    AlignBlocks: null,
    IsRotatedDrives: null,
    FreeSpacePercent: null,
    ...overrides,
  };
}

export function makeSobr(overrides: Partial<SafeSobr> = {}): SafeSobr {
  return {
    Name: "SOBR",
    EnableCapacityTier: false,
    CapacityTierCopy: false,
    CapacityTierMove: false,
    ArchiveTierEnabled: false,
    ImmutableEnabled: false,
    ExtentCount: null,
    JobCount: null,
    PolicyType: null,
    UsePerVMFiles: null,
    CapTierType: null,
    ImmutablePeriod: null,
    SizeLimitEnabled: null,
    SizeLimit: null,
    ...overrides,
  };
}

export const ALL_PASS_VALIDATIONS: ValidationResult[] = [
  PASS_RESULT,
  {
    ruleId: "job-encryption",
    title: "Job Encryption Audit",
    status: "pass",
    message: "All jobs encrypted.",
    affectedItems: [],
  },
];

export const MIXED_VALIDATIONS: ValidationResult[] = [
  PASS_RESULT,
  {
    ruleId: "job-encryption",
    title: "Job Encryption Audit",
    status: "fail",
    message: "Unencrypted jobs found.",
    affectedItems: ["Job B"],
  },
  WARNING_RESULT,
];
