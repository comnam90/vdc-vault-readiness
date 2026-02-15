import type { NormalizedDataset, SafeCapExtent } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import {
  MINIMUM_VBR_VERSION,
  MINIMUM_RETENTION_DAYS,
  MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS,
} from "./constants";
import { isVersionAtLeast } from "./version-compare";
import { parseGfsDetails } from "./calculator-aggregator";

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
    validateRetentionPeriod(data),
    validateCapTierEncryption(data),
    validateSobrImmutability(data),
    validateArchiveTierEdition(data),
    validateCapacityTierResidency(data),
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
  const capTierSobrs = new Set(
    data.sobr.filter((s) => s.EnableCapacityTier).map((s) => s.Name),
  );

  const allUnencrypted = data.jobInfo.filter((job) => !job.Encrypted);

  if (allUnencrypted.length === 0) {
    return {
      ruleId: "job-encryption",
      title: "Job Encryption Audit",
      status: "pass",
      message: "All jobs have encryption enabled.",
      affectedItems: [],
    };
  }

  const nonExempt = allUnencrypted.filter(
    (job) => !capTierSobrs.has(job.RepoName),
  );

  if (nonExempt.length > 0) {
    return {
      ruleId: "job-encryption",
      title: "Job Encryption Audit",
      status: "fail",
      message:
        "Vault requires source-side encryption. You must enable encryption on these jobs or use an encrypted Backup Copy Job. Unencrypted data cannot use Move/Copy Backup to migrate to Vault.",
      affectedItems: nonExempt.map((job) => job.JobName),
    };
  }

  // All unencrypted jobs are on cap-tier SOBRs
  return {
    ruleId: "job-encryption",
    title: "Job Encryption Audit",
    status: "warning",
    message:
      "Some jobs do not have job-level encryption enabled but target SOBRs with a capacity tier, where encryption is assumed at the SOBR layer. Verify capacity tier encryption is configured correctly.",
    affectedItems: allUnencrypted.map((job) => job.JobName),
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

function validateRetentionPeriod(data: NormalizedDataset): ValidationResult {
  const affectedJobs = data.jobInfo.filter(
    (job) => job.RetainDays !== null && job.RetainDays < MINIMUM_RETENTION_DAYS,
  );

  if (affectedJobs.length > 0) {
    return {
      ruleId: "retention-period",
      title: "Retention Period",
      status: "warning",
      message:
        "VDC Vault enforces a 30-day minimum retention period. The following jobs have retention set below this minimum and will be subject to the 30-day minimum lock.",
      affectedItems: affectedJobs.map(
        (j) => `${j.JobName} (${j.RetainDays} days)`,
      ),
    };
  }

  return {
    ruleId: "retention-period",
    title: "Retention Period",
    status: "pass",
    message: "All jobs meet the 30-day minimum retention requirement.",
    affectedItems: [],
  };
}

function validateCapTierEncryption(data: NormalizedDataset): ValidationResult {
  const unencrypted = data.capExtents.filter((e) => !e.EncryptionEnabled);

  if (unencrypted.length > 0) {
    return {
      ruleId: "sobr-cap-encryption",
      title: "Capacity Tier Encryption",
      status: "warning",
      message:
        "Capacity tier extents without encryption detected. VDC Vault requires encryption on capacity tier data. Enable encryption on these extents to ensure compliance.",
      affectedItems: unencrypted.map((e) => `${e.Name} (SOBR: ${e.SobrName})`),
    };
  }

  const sobrsMissingCapData = data.sobr.filter(
    (s) =>
      s.EnableCapacityTier &&
      !data.capExtents.some((e) => e.SobrName === s.Name),
  );

  if (sobrsMissingCapData.length > 0) {
    return {
      ruleId: "sobr-cap-encryption",
      title: "Capacity Tier Encryption",
      status: "warning",
      message:
        "Capacity tier is configured but capacity tier extent data is missing from the healthcheck. Unable to verify encryption settings. Re-export with a healthcheck version that includes capacity tier details.",
      affectedItems: sobrsMissingCapData.map((s) => s.Name),
    };
  }

  return {
    ruleId: "sobr-cap-encryption",
    title: "Capacity Tier Encryption",
    status: "pass",
    message: "All capacity tier extents have encryption enabled.",
    affectedItems: [],
  };
}

function validateSobrImmutability(data: NormalizedDataset): ValidationResult {
  const nonImmutable = data.capExtents.filter((e) => !e.ImmutableEnabled);

  if (nonImmutable.length > 0) {
    return {
      ruleId: "sobr-immutability",
      title: "Capacity Tier Immutability",
      status: "warning",
      message:
        "Capacity tier extents without immutability detected. VDC Vault enforces immutability, which increases effective retention by the immutability period plus block generation period (10 days for Azure, 30 days for AWS).",
      affectedItems: nonImmutable.map((e) => `${e.Name} (SOBR: ${e.SobrName})`),
    };
  }

  const sobrsMissingCapData = data.sobr.filter(
    (s) =>
      s.EnableCapacityTier &&
      !data.capExtents.some((e) => e.SobrName === s.Name),
  );

  if (sobrsMissingCapData.length > 0) {
    return {
      ruleId: "sobr-immutability",
      title: "Capacity Tier Immutability",
      status: "warning",
      message:
        "Capacity tier is configured but capacity tier extent data is missing from the healthcheck. Unable to verify immutability settings. Re-export with a healthcheck version that includes capacity tier details.",
      affectedItems: sobrsMissingCapData.map((s) => s.Name),
    };
  }

  return {
    ruleId: "sobr-immutability",
    title: "Capacity Tier Immutability",
    status: "pass",
    message: "All capacity tier extents have immutability enabled.",
    affectedItems: [],
  };
}

function validateArchiveTierEdition(data: NormalizedDataset): ValidationResult {
  const activeArchives = data.archExtents.filter((e) => e.ArchiveTierEnabled);

  if (activeArchives.length > 0) {
    return {
      ruleId: "archive-tier-edition",
      title: "Archive Tier Edition Requirement",
      status: "warning",
      message:
        "Archive tier is configured. VDC Vault Foundation has a 20% fair usage limit on egress that archiving consumes. Consider VDC Vault Advanced for archive tier workloads.",
      affectedItems: activeArchives.map(
        (e) => `${e.Name} (SOBR: ${e.SobrName})`,
      ),
    };
  }

  const sobrsMissingArchData = data.sobr.filter(
    (s) =>
      s.ArchiveTierEnabled &&
      !data.archExtents.some((e) => e.SobrName === s.Name),
  );

  if (sobrsMissingArchData.length > 0) {
    return {
      ruleId: "archive-tier-edition",
      title: "Archive Tier Edition Requirement",
      status: "warning",
      message:
        "Archive tier is configured but archive tier extent data is missing from the healthcheck. Unable to fully assess archive tier impact. Re-export with a healthcheck version that includes archive tier details.",
      affectedItems: sobrsMissingArchData.map((s) => s.Name),
    };
  }

  return {
    ruleId: "archive-tier-edition",
    title: "Archive Tier Edition Requirement",
    status: "pass",
    message: "No active archive tier configurations detected.",
    affectedItems: [],
  };
}

function validateCapacityTierResidency(
  data: NormalizedDataset,
): ValidationResult {
  const minDays = MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS;
  const affectedItems: string[] = [];

  const capTierSobrs = data.sobr.filter((s) => s.EnableCapacityTier);

  for (const sobr of capTierSobrs) {
    const capExtents = data.capExtents.filter((e) => e.SobrName === sobr.Name);

    if (capExtents.length === 0) {
      affectedItems.push(
        `${sobr.Name}: capacity tier enabled but extent data missing from healthcheck (unable to verify residency)`,
      );
      continue;
    }

    const { arrivalDay, immutablePeriod } = resolveCapExtentParams(capExtents);

    // Determine archive threshold for this SOBR
    let archiveOlderThan: number | null = null;
    if (sobr.ArchiveTierEnabled) {
      const archExts = data.archExtents.filter(
        (e) => e.SobrName === sobr.Name && e.ArchiveTierEnabled,
      );
      const periods = archExts
        .map((e) => e.RetentionPeriod)
        .filter((p): p is number => p !== null);
      if (periods.length > 0) {
        archiveOlderThan = Math.min(...periods);
      }
    }

    // Normal retention checks per job targeting this SOBR
    const sobrJobs = data.jobInfo.filter((job) => job.RepoName === sobr.Name);

    for (const job of sobrJobs) {
      checkNormalRetention(
        job.JobName,
        job.RetainDays,
        arrivalDay,
        immutablePeriod,
        minDays,
        affectedItems,
      );
      checkGfsRetention(
        job,
        arrivalDay,
        immutablePeriod,
        minDays,
        affectedItems,
        archiveOlderThan,
      );
    }
  }

  if (affectedItems.length > 0) {
    return {
      ruleId: "capacity-tier-residency",
      title: "Capacity Tier Residency",
      status: "warning",
      message: `Data must remain on capacity tier for at least ${minDays} days. The following items have insufficient residency.`,
      affectedItems,
    };
  }

  return {
    ruleId: "capacity-tier-residency",
    title: "Capacity Tier Residency",
    status: "pass",
    message: `All capacity tier data meets the ${minDays}-day minimum residency requirement.`,
    affectedItems: [],
  };
}

function resolveCapExtentParams(capExtents: SafeCapExtent[]): {
  arrivalDay: number;
  immutablePeriod: number;
} {
  const hasCopy = capExtents.some((e) => e.CopyModeEnabled === true);
  let arrivalDay: number;

  if (hasCopy) {
    arrivalDay = 0;
  } else {
    const movePeriods = capExtents
      .filter((e) => e.MoveModeEnabled === true)
      .map((e) => e.MovePeriodDays ?? 0);
    arrivalDay = movePeriods.length > 0 ? Math.min(...movePeriods) : 0;
  }

  const immutablePeriod = capExtents.reduce((max, e) => {
    if (e.ImmutableEnabled && e.ImmutablePeriod !== null) {
      return Math.max(max, e.ImmutablePeriod);
    }
    return max;
  }, 0);

  return { arrivalDay, immutablePeriod };
}

function checkNormalRetention(
  jobName: string,
  retainDays: number | null,
  arrivalDay: number,
  immutablePeriod: number,
  minDays: number,
  affectedItems: string[],
): void {
  if (retainDays === null) {
    return;
  }

  if (retainDays <= arrivalDay) {
    return;
  }

  const retentionResidency = retainDays - arrivalDay;

  if (retentionResidency >= minDays) {
    return;
  }

  const effectiveResidency = Math.max(retentionResidency, immutablePeriod);

  if (effectiveResidency >= minDays) {
    affectedItems.push(
      `${jobName}: normal retention ${retentionResidency} days, but immutability extends to ${effectiveResidency} days (extra storage cost)`,
    );
  } else {
    affectedItems.push(
      `${jobName}: normal retention ${retentionResidency} days on capacity (needs ${minDays}+)`,
    );
  }
}

function checkGfsRetention(
  job: {
    JobName: string;
    GfsEnabled: boolean | null;
    GfsDetails: string | null;
  },
  arrivalDay: number,
  immutablePeriod: number,
  minDays: number,
  affectedItems: string[],
  archiveOlderThan: number | null = null,
): void {
  if (!job.GfsEnabled || !job.GfsDetails) {
    return;
  }

  const gfs = parseGfsDetails(job.GfsDetails);

  const gfsChecks: { label: string; days: number }[] = [];
  if (gfs.weekly !== null) {
    gfsChecks.push({ label: "weekly", days: gfs.weekly * 7 });
  }
  if (gfs.monthly !== null) {
    gfsChecks.push({ label: "monthly", days: gfs.monthly * 30 });
  }
  if (gfs.yearly !== null) {
    gfsChecks.push({ label: "yearly", days: gfs.yearly * 365 });
  }

  // Archive can't move immutable data, so effective trigger is at least immutablePeriod
  const effectiveArchTrigger =
    archiveOlderThan !== null
      ? Math.max(archiveOlderThan, immutablePeriod)
      : null;

  for (const { label, days } of gfsChecks) {
    // Archive caps how long a GFS point stays on capacity
    const cappedByArchive =
      effectiveArchTrigger !== null && effectiveArchTrigger < days;
    const effectiveDays = cappedByArchive ? effectiveArchTrigger : days;

    if (effectiveDays <= arrivalDay) {
      continue;
    }

    const retentionResidency = effectiveDays - arrivalDay;
    if (retentionResidency >= minDays) {
      continue;
    }

    if (cappedByArchive) {
      affectedItems.push(
        `${job.JobName}: GFS ${label} archived after ${retentionResidency} days on capacity (needs ${minDays}+)`,
      );
    } else {
      const effectiveResidency = Math.max(retentionResidency, immutablePeriod);

      if (effectiveResidency >= minDays) {
        affectedItems.push(
          `${job.JobName}: GFS ${label} ${retentionResidency} days, but immutability extends to ${effectiveResidency} days (extra storage cost)`,
        );
      } else {
        affectedItems.push(
          `${job.JobName}: GFS ${label} ${retentionResidency} days on capacity (needs ${minDays}+)`,
        );
      }
    }
  }
}
