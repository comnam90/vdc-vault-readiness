import type { ParsedHealthcheckSections } from "@/types/healthcheck";
import type {
  DataError,
  NormalizedDataset,
  SafeBackupServer,
  SafeJob,
  SafeLicense,
  SafeSecuritySummary,
} from "@/types/domain";

export function normalizeHealthcheck(
  raw: ParsedHealthcheckSections,
): NormalizedDataset {
  const dataErrors: DataError[] = [];

  const jobInfo = (raw.jobInfo ?? []).flatMap((job, rowIndex) => {
    const jobName = normalizeString(job.JobName);
    if (!jobName) {
      dataErrors.push(
        buildError("jobInfo", rowIndex, "JobName", "Missing required JobName"),
      );
      return [];
    }

    const jobType = normalizeString(job.JobType);
    if (!jobType) {
      dataErrors.push(
        buildError("jobInfo", rowIndex, "JobType", "Missing required JobType"),
      );
      return [];
    }

    const repoName = normalizeString(job.RepoName);
    if (!repoName) {
      dataErrors.push(
        buildError(
          "jobInfo",
          rowIndex,
          "RepoName",
          "Missing required RepoName",
        ),
      );
      return [];
    }

    const encrypted = parseBoolean(job.Encrypted);
    if (encrypted === null) {
      dataErrors.push(
        buildError(
          "jobInfo",
          rowIndex,
          "Encrypted",
          "Missing or invalid Encrypted value",
        ),
      );
      return [];
    }

    const safeJob: SafeJob = {
      JobName: jobName,
      JobType: jobType,
      Encrypted: encrypted,
      RepoName: repoName,
    };

    return [safeJob];
  });

  const backupServer = (raw.backupServer ?? []).flatMap((server, rowIndex) => {
    const version = normalizeString(server.Version);
    if (!version) {
      dataErrors.push(
        buildError(
          "backupServer",
          rowIndex,
          "Version",
          "Missing required Version",
        ),
      );
      return [];
    }

    const name = normalizeString(server.Name);
    if (!name) {
      dataErrors.push(
        buildError("backupServer", rowIndex, "Name", "Missing required Name"),
      );
      return [];
    }

    const safeServer: SafeBackupServer = {
      Version: version,
      Name: name,
    };

    return [safeServer];
  });

  const securitySummary = (raw.securitySummary ?? []).flatMap(
    (summary, rowIndex) => {
      const backupFileEncrypted = parseBoolean(
        summary.BackupFileEncryptionEnabled,
      );
      if (backupFileEncrypted === null) {
        dataErrors.push(
          buildError(
            "securitySummary",
            rowIndex,
            "BackupFileEncryptionEnabled",
            "Missing or invalid BackupFileEncryptionEnabled value",
          ),
        );
        return [];
      }

      const configBackupEncrypted = parseBoolean(
        summary.ConfigBackupEncryptionEnabled,
      );
      if (configBackupEncrypted === null) {
        dataErrors.push(
          buildError(
            "securitySummary",
            rowIndex,
            "ConfigBackupEncryptionEnabled",
            "Missing or invalid ConfigBackupEncryptionEnabled value",
          ),
        );
        return [];
      }

      const safeSummary: SafeSecuritySummary = {
        BackupFileEncryptionEnabled: backupFileEncrypted,
        ConfigBackupEncryptionEnabled: configBackupEncrypted,
      };

      return [safeSummary];
    },
  );

  const Licenses = (raw.Licenses ?? []).flatMap((license, rowIndex) => {
    const edition = normalizeString(license.Edition);
    if (!edition) {
      dataErrors.push(
        buildError("Licenses", rowIndex, "Edition", "Missing required Edition"),
      );
      return [];
    }

    const status = normalizeString(license.Status);
    if (!status) {
      dataErrors.push(
        buildError("Licenses", rowIndex, "Status", "Missing required Status"),
      );
      return [];
    }

    const safeLicense: SafeLicense = {
      Edition: edition,
      Status: status,
    };

    return [safeLicense];
  });

  return {
    backupServer,
    securitySummary,
    jobInfo,
    Licenses,
    dataErrors,
  };
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBoolean(value: string | null | undefined): boolean | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

function buildError(
  section: DataError["section"],
  rowIndex: number,
  field: string,
  reason: string,
): DataError {
  return {
    level: "Data Error",
    section,
    rowIndex,
    field,
    reason,
  };
}
