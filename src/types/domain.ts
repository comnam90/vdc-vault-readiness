export interface SafeJob {
  JobName: string;
  JobType: string;
  Encrypted: boolean;
  RepoName: string;
}

export interface SafeBackupServer {
  Version: string;
  Name: string;
}

export interface SafeSecuritySummary {
  BackupFileEncryptionEnabled: boolean;
  ConfigBackupEncryptionEnabled: boolean;
}

export interface SafeLicense {
  Edition: string;
  Status: string;
}

export type DataError = {
  level: "Data Error";
  section: "backupServer" | "securitySummary" | "jobInfo" | "Licenses";
  rowIndex: number;
  field: string;
  reason: string;
};

export interface NormalizedDataset {
  backupServer: SafeBackupServer[];
  securitySummary: SafeSecuritySummary[];
  jobInfo: SafeJob[];
  Licenses: SafeLicense[];
  dataErrors: DataError[];
}
