import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import { isVersionAtLeast } from "./version-compare";

const MINIMUM_VBR_VERSION = "12.1.2";

export function validateHealthcheck(
  data: NormalizedDataset,
): ValidationResult[] {
  return [
    validateVbrVersion(data),
    validateGlobalEncryption(data),
    validateJobEncryption(data),
    validateAwsWorkload(data),
    validateAgentWorkload(data),
    validateLicenseEdition(data),
  ];
}

function validateVbrVersion(data: NormalizedDataset): ValidationResult {
  if (data.backupServer.length === 0) {
    return {
      ruleId: "vbr-version",
      title: "VBR Version Compatibility",
      status: "fail",
      message: `No VBR server found in the healthcheck data. VDC Vault requires VBR version ${MINIMUM_VBR_VERSION} or higher.`,
      affectedItems: [],
    };
  }

  const failedServers = data.backupServer.filter(
    (server) => !isVersionAtLeast(server.Version, MINIMUM_VBR_VERSION),
  );

  if (failedServers.length > 0) {
    return {
      ruleId: "vbr-version",
      title: "VBR Version Compatibility",
      status: "fail",
      message: `VBR version must be ${MINIMUM_VBR_VERSION} or higher to use VDC Vault. Upgrade required.`,
      affectedItems: failedServers.map((s) => s.Name),
    };
  }

  return {
    ruleId: "vbr-version",
    title: "VBR Version Compatibility",
    status: "pass",
    message: `All VBR servers meet the minimum version requirement (${MINIMUM_VBR_VERSION}+).`,
    affectedItems: [],
  };
}

function validateGlobalEncryption(data: NormalizedDataset): ValidationResult {
  if (data.securitySummary.length === 0) {
    return {
      ruleId: "global-encryption",
      title: "Global Encryption Configuration",
      status: "pass",
      message: "No security summary found. Skipping global encryption check.",
      affectedItems: [],
    };
  }

  const summary = data.securitySummary[0];
  const allEnabled =
    summary.BackupFileEncryptionEnabled &&
    summary.ConfigBackupEncryptionEnabled;

  if (!allEnabled) {
    return {
      ruleId: "global-encryption",
      title: "Global Encryption Configuration",
      status: "warning",
      message:
        "Global encryption is disabled. VDC Vault requires all data to be encrypted. Best practice is to enable BackupFileEncryption and ConfigBackupEncryption globally to ensure compliance.",
      affectedItems: [],
    };
  }

  return {
    ruleId: "global-encryption",
    title: "Global Encryption Configuration",
    status: "pass",
    message: "Global encryption settings are enabled.",
    affectedItems: [],
  };
}

function validateJobEncryption(data: NormalizedDataset): ValidationResult {
  const unencryptedJobs = data.jobInfo.filter((job) => !job.Encrypted);

  if (unencryptedJobs.length > 0) {
    return {
      ruleId: "job-encryption",
      title: "Job Encryption Audit",
      status: "fail",
      message:
        "Vault requires source-side encryption. You must enable encryption on these jobs or use an encrypted Backup Copy Job. Unencrypted data cannot use Move/Copy Backup to migrate to Vault.",
      affectedItems: unencryptedJobs.map((job) => job.JobName),
    };
  }

  return {
    ruleId: "job-encryption",
    title: "Job Encryption Audit",
    status: "pass",
    message: "All jobs have encryption enabled.",
    affectedItems: [],
  };
}

function validateAwsWorkload(data: NormalizedDataset): ValidationResult {
  const awsJobs = data.jobInfo.filter((job) =>
    job.JobType.toLowerCase().includes("veeam.vault.aws"),
  );

  if (awsJobs.length > 0) {
    return {
      ruleId: "aws-workload",
      title: "AWS Workload Support",
      status: "fail",
      message:
        "VDC Vault cannot target Vault directly for Veeam Backup for AWS workloads. This is a hard limitation. Use Backup Copy Jobs to transfer AWS backups to Vault instead.",
      affectedItems: awsJobs.map((job) => job.JobName),
    };
  }

  return {
    ruleId: "aws-workload",
    title: "AWS Workload Support",
    status: "pass",
    message: "No AWS workloads detected that would block Vault integration.",
    affectedItems: [],
  };
}

function validateAgentWorkload(data: NormalizedDataset): ValidationResult {
  const agentJobs = data.jobInfo.filter((job) =>
    job.JobType.toLowerCase().includes("agent"),
  );

  if (agentJobs.length > 0) {
    return {
      ruleId: "agent-workload",
      title: "Agent Workload Configuration",
      status: "warning",
      message:
        "Agent workloads detected. Veeam Agents cannot write directly to object storage. Ensure you configure a Gateway Server or use Cloud Connect to route these backups to Vault.",
      affectedItems: agentJobs.map((job) => job.JobName),
    };
  }

  return {
    ruleId: "agent-workload",
    title: "Agent Workload Configuration",
    status: "pass",
    message: "No agent workloads detected.",
    affectedItems: [],
  };
}

function validateLicenseEdition(data: NormalizedDataset): ValidationResult {
  const affectedLicenses = data.Licenses.filter((license) => {
    const edition = license.Edition.trim().toLowerCase();
    return edition.includes("community") || edition.includes("free");
  });

  if (affectedLicenses.length > 0) {
    return {
      ruleId: "license-edition",
      title: "License/Edition Notes",
      status: "info",
      message:
        "Community Edition detected. Ensure you are aware of SOBR limitations when designing your Vault strategy.",
      affectedItems: affectedLicenses.map((license) => license.Edition),
    };
  }

  return {
    ruleId: "license-edition",
    title: "License/Edition Notes",
    status: "pass",
    message: "No Community or Free editions detected.",
    affectedItems: [],
  };
}
