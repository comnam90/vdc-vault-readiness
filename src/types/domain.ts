export interface SafeJob {
  JobName: string;
  JobType: string;
  Encrypted: boolean;
  RepoName: string;
  RetainDays: number | null;
  GfsDetails: string | null;
  SourceSizeGB: number | null;
  OnDiskGB: number | null;
  RetentionScheme: string | null;
  CompressionLevel: string | null;
  BlockSize: string | null;
  GfsEnabled: boolean | null;
  ActiveFullEnabled: boolean | null;
  SyntheticFullEnabled: boolean | null;
  BackupChainType: string | null;
  IndexingEnabled: boolean | null;
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

export interface SafeJobSession {
  JobName: string;
  MaxDataSize: number | null;
  AvgChangeRate: number | null;
  SuccessRate: number | null;
  SessionCount: number | null;
  Fails: number | null;
  AvgJobTime: string | null;
  MaxJobTime: string | null;
}

export type DataError = {
  level: "Data Error";
  section:
    | "backupServer"
    | "securitySummary"
    | "jobInfo"
    | "Licenses"
    | "jobSessionSummaryByJob";
  rowIndex: number;
  field: string;
  reason: string;
};

export interface NormalizedDataset {
  backupServer: SafeBackupServer[];
  securitySummary: SafeSecuritySummary[];
  jobInfo: SafeJob[];
  Licenses: SafeLicense[];
  jobSessionSummary: SafeJobSession[];
  dataErrors: DataError[];
}

export interface PipelineStep {
  id: string;
  label: string;
}
