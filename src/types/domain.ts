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

export interface SafeSobr {
  Name: string;
  EnableCapacityTier: boolean;
  CapacityTierCopy: boolean;
  CapacityTierMove: boolean;
  ArchiveTierEnabled: boolean;
  ImmutableEnabled: boolean;
  ExtentCount: number | null;
  JobCount: number | null;
  PolicyType: string | null;
  UsePerVMFiles: boolean | null;
  CapTierType: string | null;
  ImmutablePeriod: number | null;
  SizeLimitEnabled: boolean | null;
  SizeLimit: number | null;
}

export interface SafeCapExtent {
  Name: string;
  SobrName: string;
  EncryptionEnabled: boolean;
  ImmutableEnabled: boolean;
  Type: string | null;
  Status: string | null;
  CopyModeEnabled: boolean | null;
  MoveModeEnabled: boolean | null;
  MovePeriodDays: number | null;
  ImmutablePeriod: number | null;
  SizeLimitEnabled: boolean | null;
  SizeLimit: number | null;
}

export interface SafeArchExtent {
  SobrName: string;
  Name: string;
  ArchiveTierEnabled: boolean;
  EncryptionEnabled: boolean;
  ImmutableEnabled: boolean;
  OffloadPeriod: number | null;
  CostOptimizedEnabled: boolean | null;
  FullBackupModeEnabled: boolean | null;
}

export type DataError = {
  level: "Data Error";
  section:
    | "backupServer"
    | "securitySummary"
    | "jobInfo"
    | "Licenses"
    | "jobSessionSummaryByJob"
    | "sobr"
    | "capextents"
    | "archextents";
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
  sobr: SafeSobr[];
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
  dataErrors: DataError[];
}

export interface PipelineStep {
  id: string;
  label: string;
}
