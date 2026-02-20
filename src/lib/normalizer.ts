import type { NormalizerInput } from "@/types/healthcheck";
import type {
  DataError,
  NormalizedDataset,
  SafeArchExtent,
  SafeBackupServer,
  SafeCapExtent,
  SafeExtent,
  SafeJob,
  SafeJobSession,
  SafeLicense,
  SafeRepo,
  SafeSecuritySummary,
  SafeSobr,
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
      SourceSizeGB: parseNumeric(
        job.SourceSizeGB as string | null | undefined,
        "jobInfo",
        rowIndex,
        "SourceSizeGB",
        dataErrors,
      ),
      OnDiskGB: parseNumeric(
        job.OnDiskGB as string | null | undefined,
        "jobInfo",
        rowIndex,
        "OnDiskGB",
        dataErrors,
      ),
      RetentionScheme: normalizeString(
        job.RetentionScheme as string | null | undefined,
      ),
      CompressionLevel: normalizeString(
        job.CompressionLevel as string | null | undefined,
      ),
      BlockSize: normalizeString(job.BlockSize as string | null | undefined),
      GfsEnabled: parseBoolean(job.GfsEnabled as string | null | undefined),
      ActiveFullEnabled: parseBoolean(
        job.ActiveFullEnabled as string | null | undefined,
      ),
      SyntheticFullEnabled: parseBoolean(
        job.SyntheticFullEnabled as string | null | undefined,
      ),
      BackupChainType: normalizeString(
        job.BackupChainType as string | null | undefined,
      ),
      IndexingEnabled: parseBoolean(
        job.IndexingEnabled as string | null | undefined,
      ),
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
    sobr: normalizeSobr(asArray(raw.sobr), dataErrors),
    extents: normalizeExtents(asArray(raw.extents), dataErrors),
    capExtents: normalizeCapExtents(asArray(raw.capextents), dataErrors),
    archExtents: normalizeArchExtents(asArray(raw.archextents), dataErrors),
    repos: normalizeRepos(asArray(raw.repos), dataErrors),
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

    // Skip summary rows (e.g., "Total") to avoid double-counting in aggregations
    if (jobName.toLowerCase() === "total") {
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
      SuccessRate: parseNumeric(
        record.SuccessRate as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "SuccessRate",
        dataErrors,
      ),
      SessionCount: parseNumeric(
        record.SessionCount as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "SessionCount",
        dataErrors,
      ),
      Fails: parseNumeric(
        record.Fails as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "Fails",
        dataErrors,
      ),
      AvgJobTime: normalizeString(
        record.AvgJobTime as string | null | undefined,
      ),
      MaxJobTime: normalizeString(
        record.MaxJobTime as string | null | undefined,
      ),
    };

    return [safeSession];
  });
}

type SobrRecord = Record<string, string | null | undefined>;

function normalizeSobr(
  rows: SobrRecord[],
  dataErrors: DataError[],
): SafeSobr[] {
  return rows.flatMap((row, rowIndex) => {
    if (!isRecord(row)) {
      dataErrors.push(
        buildError("sobr", rowIndex, "_row", "Invalid row: not an object"),
      );
      return [];
    }

    const name = normalizeString(row.Name as string | null | undefined);
    if (!name) {
      dataErrors.push(
        buildError("sobr", rowIndex, "Name", "Missing required Name"),
      );
      return [];
    }

    const enableCapacityTier = parseBoolean(
      row.EnableCapacityTier as string | null | undefined,
    );
    if (enableCapacityTier === null) {
      dataErrors.push(
        buildError(
          "sobr",
          rowIndex,
          "EnableCapacityTier",
          "Missing or invalid EnableCapacityTier value",
        ),
      );
      return [];
    }

    const capacityTierCopy = parseBoolean(
      row.CapacityTierCopy as string | null | undefined,
    );
    if (capacityTierCopy === null) {
      dataErrors.push(
        buildError(
          "sobr",
          rowIndex,
          "CapacityTierCopy",
          "Missing or invalid CapacityTierCopy value",
        ),
      );
      return [];
    }

    const capacityTierMove = parseBoolean(
      row.CapacityTierMove as string | null | undefined,
    );
    if (capacityTierMove === null) {
      dataErrors.push(
        buildError(
          "sobr",
          rowIndex,
          "CapacityTierMove",
          "Missing or invalid CapacityTierMove value",
        ),
      );
      return [];
    }

    const archiveTierEnabled = parseBoolean(
      row.ArchiveTierEnabled as string | null | undefined,
    );
    if (archiveTierEnabled === null) {
      dataErrors.push(
        buildError(
          "sobr",
          rowIndex,
          "ArchiveTierEnabled",
          "Missing or invalid ArchiveTierEnabled value",
        ),
      );
      return [];
    }

    const immutableEnabled = parseBoolean(
      row.ImmutableEnabled as string | null | undefined,
    );
    if (immutableEnabled === null) {
      dataErrors.push(
        buildError(
          "sobr",
          rowIndex,
          "ImmutableEnabled",
          "Missing or invalid ImmutableEnabled value",
        ),
      );
      return [];
    }

    const safeSobr: SafeSobr = {
      Name: name,
      EnableCapacityTier: enableCapacityTier,
      CapacityTierCopy: capacityTierCopy,
      CapacityTierMove: capacityTierMove,
      ArchiveTierEnabled: archiveTierEnabled,
      ImmutableEnabled: immutableEnabled,
      ExtentCount: parseNumeric(
        row.ExtentCount as string | null | undefined,
        "sobr",
        rowIndex,
        "ExtentCount",
        dataErrors,
      ),
      JobCount: parseNumeric(
        row.JobCount as string | null | undefined,
        "sobr",
        rowIndex,
        "JobCount",
        dataErrors,
      ),
      PolicyType: normalizeString(row.PolicyType as string | null | undefined),
      UsePerVMFiles: parseBoolean(
        row.UsePerVMFiles as string | null | undefined,
      ),
      CapTierType: normalizeString(
        row.CapTierType as string | null | undefined,
      ),
      ImmutablePeriod: parseNumeric(
        row.ImmutablePeriod as string | null | undefined,
        "sobr",
        rowIndex,
        "ImmutablePeriod",
        dataErrors,
      ),
      SizeLimitEnabled: parseBoolean(
        row.SizeLimitEnabled as string | null | undefined,
      ),
      SizeLimit: parseNumeric(
        row.SizeLimit as string | null | undefined,
        "sobr",
        rowIndex,
        "SizeLimit",
        dataErrors,
      ),
    };

    return [safeSobr];
  });
}

type ExtentRecord = Record<string, string | null | undefined>;

function normalizeExtents(
  rows: ExtentRecord[],
  dataErrors: DataError[],
): SafeExtent[] {
  return rows.flatMap((row, rowIndex) => {
    if (!isRecord(row)) {
      dataErrors.push(
        buildError("extents", rowIndex, "_row", "Invalid row: not an object"),
      );
      return [];
    }

    const name = normalizeString(row.Name as string | null | undefined);
    if (!name) {
      dataErrors.push(
        buildError("extents", rowIndex, "Name", "Missing required Name"),
      );
      return [];
    }

    const sobrName = normalizeString(row.SobrName as string | null | undefined);
    if (!sobrName) {
      dataErrors.push(
        buildError(
          "extents",
          rowIndex,
          "SobrName",
          "Missing required SobrName",
        ),
      );
      return [];
    }

    const safeExtent: SafeExtent = {
      Name: name,
      SobrName: sobrName,
      Type: normalizeString(row.Type as string | null | undefined),
      Host: normalizeString(row.Host as string | null | undefined),
      ImmutabilitySupported: parseBoolean(
        row.IsImmutabilitySupported as string | null | undefined,
      ),
      FreeSpaceTB: parseNumeric(
        row.FreeSpace as string | null | undefined,
        "extents",
        rowIndex,
        "FreeSpace",
        dataErrors,
      ),
      TotalSpaceTB: parseNumeric(
        row.TotalSpace as string | null | undefined,
        "extents",
        rowIndex,
        "TotalSpace",
        dataErrors,
      ),
    };

    return [safeExtent];
  });
}

type CapExtentRecord = Record<string, string | null | undefined>;

function normalizeCapExtents(
  rows: CapExtentRecord[],
  dataErrors: DataError[],
): SafeCapExtent[] {
  return rows.flatMap((row, rowIndex) => {
    if (!isRecord(row)) {
      dataErrors.push(
        buildError(
          "capextents",
          rowIndex,
          "_row",
          "Invalid row: not an object",
        ),
      );
      return [];
    }

    const name = normalizeString(row.Name as string | null | undefined);
    if (!name) {
      dataErrors.push(
        buildError("capextents", rowIndex, "Name", "Missing required Name"),
      );
      return [];
    }

    const sobrName = normalizeString(row.SobrName as string | null | undefined);
    if (!sobrName) {
      dataErrors.push(
        buildError(
          "capextents",
          rowIndex,
          "SobrName",
          "Missing required SobrName",
        ),
      );
      return [];
    }

    const encryptionEnabled = parseBoolean(
      row.EncryptionEnabled as string | null | undefined,
    );
    if (encryptionEnabled === null) {
      dataErrors.push(
        buildError(
          "capextents",
          rowIndex,
          "EncryptionEnabled",
          "Missing or invalid EncryptionEnabled value",
        ),
      );
      return [];
    }

    const immutableEnabled = parseBoolean(
      row.ImmutableEnabled as string | null | undefined,
    );
    if (immutableEnabled === null) {
      dataErrors.push(
        buildError(
          "capextents",
          rowIndex,
          "ImmutableEnabled",
          "Missing or invalid ImmutableEnabled value",
        ),
      );
      return [];
    }

    const safeCapExtent: SafeCapExtent = {
      Name: name,
      SobrName: sobrName,
      EncryptionEnabled: encryptionEnabled,
      ImmutableEnabled: immutableEnabled,
      Type: normalizeString(row.Type as string | null | undefined),
      Status: normalizeString(row.Status as string | null | undefined),
      CopyModeEnabled: parseBoolean(
        row.CopyModeEnabled as string | null | undefined,
      ),
      MoveModeEnabled: parseBoolean(
        row.MoveModeEnabled as string | null | undefined,
      ),
      MovePeriodDays: parseNumeric(
        row.MovePeriodDays as string | null | undefined,
        "capextents",
        rowIndex,
        "MovePeriodDays",
        dataErrors,
      ),
      ImmutablePeriod: parseNumeric(
        row.ImmutablePeriod as string | null | undefined,
        "capextents",
        rowIndex,
        "ImmutablePeriod",
        dataErrors,
      ),
      SizeLimitEnabled: parseBoolean(
        row.SizeLimitEnabled as string | null | undefined,
      ),
      SizeLimit: parseNumeric(
        row.SizeLimit as string | null | undefined,
        "capextents",
        rowIndex,
        "SizeLimit",
        dataErrors,
      ),
    };

    return [safeCapExtent];
  });
}

type ArchExtentRecord = Record<string, string | null | undefined>;

function normalizeArchExtents(
  rows: ArchExtentRecord[],
  dataErrors: DataError[],
): SafeArchExtent[] {
  return rows.flatMap((row, rowIndex) => {
    if (!isRecord(row)) {
      dataErrors.push(
        buildError(
          "archextents",
          rowIndex,
          "_row",
          "Invalid row: not an object",
        ),
      );
      return [];
    }

    const sobrName = normalizeString(row.SobrName as string | null | undefined);
    if (!sobrName) {
      dataErrors.push(
        buildError(
          "archextents",
          rowIndex,
          "SobrName",
          "Missing required SobrName",
        ),
      );
      return [];
    }

    const name = normalizeString(row.Name as string | null | undefined);
    if (!name) {
      dataErrors.push(
        buildError("archextents", rowIndex, "Name", "Missing required Name"),
      );
      return [];
    }

    const archiveTierEnabled = parseBoolean(
      row.ArchiveTierEnabled as string | null | undefined,
    );
    if (archiveTierEnabled === null) {
      dataErrors.push(
        buildError(
          "archextents",
          rowIndex,
          "ArchiveTierEnabled",
          "Missing or invalid ArchiveTierEnabled value",
        ),
      );
      return [];
    }

    const encryptionEnabled = parseBoolean(
      row.EncryptionEnabled as string | null | undefined,
    );
    if (encryptionEnabled === null) {
      dataErrors.push(
        buildError(
          "archextents",
          rowIndex,
          "EncryptionEnabled",
          "Missing or invalid EncryptionEnabled value",
        ),
      );
      return [];
    }

    const immutableEnabled = parseBoolean(
      row.ImmutableEnabled as string | null | undefined,
    );
    if (immutableEnabled === null) {
      dataErrors.push(
        buildError(
          "archextents",
          rowIndex,
          "ImmutableEnabled",
          "Missing or invalid ImmutableEnabled value",
        ),
      );
      return [];
    }

    const safeArchExtent: SafeArchExtent = {
      SobrName: sobrName,
      Name: name,
      ArchiveTierEnabled: archiveTierEnabled,
      EncryptionEnabled: encryptionEnabled,
      ImmutableEnabled: immutableEnabled,
      OffloadPeriod: parseNumeric(
        (row.OffloadPeriod ?? row.RetentionPeriod) as string | null | undefined,
        "archextents",
        rowIndex,
        "OffloadPeriod",
        dataErrors,
      ),
      CostOptimizedEnabled: parseBoolean(
        row.CostOptimizedEnabled as string | null | undefined,
      ),
      FullBackupModeEnabled: parseBoolean(
        row.FullBackupModeEnabled as string | null | undefined,
      ),
    };

    return [safeArchExtent];
  });
}

type RepoRecord = Record<string, string | null | undefined>;

function normalizeRepos(
  rows: RepoRecord[],
  dataErrors: DataError[],
): SafeRepo[] {
  return rows.flatMap((row, rowIndex) => {
    if (!isRecord(row)) {
      dataErrors.push(
        buildError("repos", rowIndex, "_row", "Invalid row: not an object"),
      );
      return [];
    }

    const name = normalizeString(row.Name as string | null | undefined);
    if (!name) {
      dataErrors.push(
        buildError("repos", rowIndex, "Name", "Missing required Name"),
      );
      return [];
    }

    const immutabilitySupported = parseBoolean(
      row.IsImmutabilitySupported as string | null | undefined,
    );
    if (immutabilitySupported === null) {
      dataErrors.push(
        buildError(
          "repos",
          rowIndex,
          "IsImmutabilitySupported",
          "Missing or invalid IsImmutabilitySupported value",
        ),
      );
      return [];
    }

    const safeRepo: SafeRepo = {
      Name: name,
      ImmutabilitySupported: immutabilitySupported,
      JobCount: parseNumeric(
        row.JobCount as string | null | undefined,
        "repos",
        rowIndex,
        "JobCount",
        dataErrors,
      ),
      TotalSpaceTB: parseNumeric(
        row.TotalSpace as string | null | undefined,
        "repos",
        rowIndex,
        "TotalSpace",
        dataErrors,
      ),
      FreeSpaceTB: parseNumeric(
        row.FreeSpace as string | null | undefined,
        "repos",
        rowIndex,
        "FreeSpace",
        dataErrors,
      ),
      Type: normalizeString(row.Type as string | null | undefined),
    };

    return [safeRepo];
  });
}
