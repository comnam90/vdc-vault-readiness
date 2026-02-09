import type { Section } from "@/lib/parser";

export type HealthcheckRowValue = string | null | undefined;

export interface HealthcheckSection extends Section {
  SectionName?: string;
  Summary?: unknown;
}

export interface HealthcheckSections {
  backupServer?: HealthcheckSection;
  securitySummary?: HealthcheckSection;
  jobInfo?: HealthcheckSection;
  [key: string]: HealthcheckSection | undefined;
}

export interface HealthcheckRoot {
  Sections: HealthcheckSections;
  Licenses?: License[];
  [key: string]: unknown;
}

export interface JobInfo {
  JobName: HealthcheckRowValue;
  JobType: HealthcheckRowValue;
  Encrypted: HealthcheckRowValue;
  RepoName: HealthcheckRowValue;
  [key: string]: HealthcheckRowValue;
}

export interface BackupServer {
  Version: HealthcheckRowValue;
  Name: HealthcheckRowValue;
  [key: string]: HealthcheckRowValue;
}

export interface SecuritySummary {
  BackupFileEncryptionEnabled: HealthcheckRowValue;
  ConfigBackupEncryptionEnabled: HealthcheckRowValue;
  [key: string]: HealthcheckRowValue;
}

export interface License {
  Edition: HealthcheckRowValue;
  Status: HealthcheckRowValue;
  [key: string]: string | null | undefined;
}

export interface HealthcheckSectionMap {
  backupServer: BackupServer;
  securitySummary: SecuritySummary;
  jobInfo: JobInfo;
  Licenses: License;
}

export type ParsedHealthcheckSections = {
  [K in keyof HealthcheckSectionMap]: HealthcheckSectionMap[K][];
};

/**
 * Loose input type for the normalizer.
 *
 * Accepts both typed interfaces (from unit tests using BackupServer[] etc.)
 * and raw Records (from zipSection output in the pipeline).
 * The normalizer validates every field defensively, so this is safe.
 */
export interface NormalizerInput {
  backupServer?: Record<string, HealthcheckRowValue>[];
  securitySummary?: Record<string, HealthcheckRowValue>[];
  jobInfo?: Record<string, HealthcheckRowValue>[];
  Licenses?: Record<string, HealthcheckRowValue>[];
  jobSessionSummaryByJob?: Record<string, HealthcheckRowValue>[];
}
