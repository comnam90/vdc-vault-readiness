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
  // Root keys added by veeam-healthcheck 3.x exports; absent from older ones.
  /** veeam-healthcheck tool version that produced the export (e.g. "3.1.1.301"). */
  VhcVersion?: string;
  /** Metadata for the tool's compliance scan run. Not read by the app. */
  ComplianceScan?: {
    StartedAt?: string;
    CompletedAt?: string;
    DurationSeconds?: number;
    Status?: string;
    RuleCount?: number;
  };
  /** Orphaned superseded backup chains found by the restore-point sweep. Not read by the app. */
  OrphanedSupersededBackups?: unknown[];
  /** Whether the restore-point sweep ran. Not read by the app. */
  OrphanedBackupsSweepEvaluated?: boolean;
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
  jobSummary?: Record<string, HealthcheckRowValue>[];
  sobr?: Record<string, HealthcheckRowValue>[];
  extents?: Record<string, HealthcheckRowValue>[];
  capextents?: Record<string, HealthcheckRowValue>[];
  archextents?: Record<string, HealthcheckRowValue>[];
  repos?: Record<string, HealthcheckRowValue>[];
}
