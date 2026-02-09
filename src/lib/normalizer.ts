import type { NormalizerInput } from "@/types/healthcheck";
import type {
  DataError,
  NormalizedDataset,
  SafeBackupServer,
  SafeJob,
  SafeJobSession,
  SafeLicense,
  SafeSecuritySummary,
} from "@/types/domain";

type SessionRecord = Record<string, string | null | undefined>;

export function normalizeHealthcheck(
  raw: Partial<NormalizerInput>,
  sessionData?: SessionRecord[],
): NormalizedDataset {
  const dataErrors: DataError[] = [];

  const jobInfo = asArray(raw.jobInfo).flatMap((job, rowIndex) => {
    if (!isRecord(job)) {
      dataErrors.push(
        buildError("jobInfo", rowIndex, "_row", "Invalid row: not an object"),
      );
      return [];
    }

    const jobName = normalizeString(job.JobName as string | null | undefined);
    if (!jobName) {
      dataErrors.push(
        buildError("jobInfo", rowIndex, "JobName", "Missing required JobName"),
      );
      return [];
    }

    const jobType = normalizeString(job.JobType as string | null | undefined);
    if (!jobType) {
      dataErrors.push(
        buildError("jobInfo", rowIndex, "JobType", "Missing required JobType"),
      );
      return [];
    }

    const repoName = normalizeString(job.RepoName as string | null | undefined);
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

    const encrypted = parseBoolean(job.Encrypted as string | null | undefined);
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
      RetainDays: parseNumeric(
        job.RetainDays as string | null | undefined,
        "jobInfo",
        rowIndex,
        "RetainDays",
        dataErrors,
      ),
      GfsDetails: normalizeString(job.GfsDetails as string | null | undefined),
    };

    return [safeJob];
  });

  const backupServer = asArray(raw.backupServer).flatMap((server, rowIndex) => {
    if (!isRecord(server)) {
      dataErrors.push(
        buildError(
          "backupServer",
          rowIndex,
          "_row",
          "Invalid row: not an object",
        ),
      );
      return [];
    }

    const version = normalizeString(
      server.Version as string | null | undefined,
    );
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

    const name = normalizeString(server.Name as string | null | undefined);
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

  const securitySummary = asArray(raw.securitySummary).flatMap(
    (summary, rowIndex) => {
      if (!isRecord(summary)) {
        dataErrors.push(
          buildError(
            "securitySummary",
            rowIndex,
            "_row",
            "Invalid row: not an object",
          ),
        );
        return [];
      }

      const backupFileEncrypted = parseBoolean(
        summary.BackupFileEncryptionEnabled as string | null | undefined,
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
        summary.ConfigBackupEncryptionEnabled as string | null | undefined,
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

  const Licenses = asArray(raw.Licenses).flatMap((license, rowIndex) => {
    if (!isRecord(license)) {
      dataErrors.push(
        buildError("Licenses", rowIndex, "_row", "Invalid row: not an object"),
      );
      return [];
    }

    const edition = normalizeString(
      license.Edition as string | null | undefined,
    );
    if (!edition) {
      dataErrors.push(
        buildError("Licenses", rowIndex, "Edition", "Missing required Edition"),
      );
      return [];
    }

    const status = normalizeString(license.Status as string | null | undefined);
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
    jobSessionSummary: normalizeJobSessions(asArray(sessionData), dataErrors),
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

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumeric(
  value: string | null | undefined,
  section: DataError["section"],
  rowIndex: number,
  field: string,
  dataErrors: DataError[],
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    dataErrors.push(
      buildError(
        section,
        rowIndex,
        field,
        `Invalid numeric value: "${trimmed}"`,
      ),
    );
    return null;
  }

  return parsed;
}

function normalizeJobSessions(
  sessionData: SessionRecord[],
  dataErrors: DataError[],
): SafeJobSession[] {
  return sessionData.flatMap((record, rowIndex) => {
    if (!isRecord(record)) {
      dataErrors.push(
        buildError(
          "jobSessionSummaryByJob",
          rowIndex,
          "_row",
          "Invalid row: not an object",
        ),
      );
      return [];
    }

    const jobName = normalizeString(
      record.JobName as string | null | undefined,
    );
    if (!jobName) {
      dataErrors.push(
        buildError(
          "jobSessionSummaryByJob",
          rowIndex,
          "JobName",
          "Missing required JobName",
        ),
      );
      return [];
    }

    const safeSession: SafeJobSession = {
      JobName: jobName,
      MaxDataSize: parseNumeric(
        record.MaxDataSize as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "MaxDataSize",
        dataErrors,
      ),
      AvgChangeRate: parseNumeric(
        record.AvgChangeRate as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "AvgChangeRate",
        dataErrors,
      ),
    };

    return [safeSession];
  });
}
