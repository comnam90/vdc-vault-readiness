import type { NormalizedDataset } from "@/types/domain";
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
    },
    {
      JobName: "Job B",
      JobType: "Agent Backup",
      Encrypted: false,
      RepoName: "WinLocal",
    },
    {
      JobName: "Job C",
      JobType: "File Backup",
      Encrypted: true,
      RepoName: "VeeamVault",
    },
  ],
  Licenses: [{ Edition: "Enterprise Plus", Status: "Active" }],
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
