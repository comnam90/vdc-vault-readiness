import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateHealthcheck } from "@/lib/validator";
import type { NormalizedDataset } from "@/types/domain";

describe("validateHealthcheck", () => {
  describe("Rule 1: VBR Version Check", () => {
    it("passes when version is 12.1.2 or higher", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "12.1.2.100", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const versionCheck = results.find((r) => r.ruleId === "vbr-version");

      expect(versionCheck).toBeDefined();
      expect(versionCheck?.status).toBe("pass");
      expect(versionCheck?.affectedItems).toHaveLength(0);
    });

    it("fails when version is below 12.1.2", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "11.0.1.1234", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const versionCheck = results.find((r) => r.ruleId === "vbr-version");

      expect(versionCheck).toBeDefined();
      expect(versionCheck?.status).toBe("fail");
      expect(versionCheck?.title).toBe("VBR Version Compatibility");
      expect(versionCheck?.message).toContain("12.1.2");
      expect(versionCheck?.affectedItems).toContain("ServerA");
    });

    it("passes with newer major version", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerB" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const versionCheck = results.find((r) => r.ruleId === "vbr-version");

      expect(versionCheck?.status).toBe("pass");
    });
  });

  describe("Rule 2: Configuration Backup Encryption Check", () => {
    it("passes when ConfigBackupEncryptionEnabled is true", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "config-backup-encryption",
      );

      expect(check).toBeDefined();
      expect(check?.status).toBe("pass");
      expect(check?.title).toBe("Configuration Backup Encryption");
    });

    it("ignores BackupFileEncryptionEnabled when ConfigBackup is encrypted", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: false,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "config-backup-encryption",
      );

      expect(check?.status).toBe("pass");
    });

    it("warns when ConfigBackupEncryptionEnabled is false", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: false,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "config-backup-encryption",
      );

      expect(check?.status).toBe("warning");
      expect(check?.title).toBe("Configuration Backup Encryption");
      expect(check?.message).toContain("configuration backup");
      expect(check?.message).toContain("encryption");
    });

    it("returns skipped when securitySummary is empty", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "config-backup-encryption",
      );

      expect(check?.status).toBe("skipped");
      expect(check?.message).toContain("skipped");
      expect(check?.message).toContain("security summary");
    });
  });

  describe("Rule 3: Job Encryption Audit", () => {
    it("passes when all jobs are encrypted", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Replica",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const jobEncryptionCheck = results.find(
        (r) => r.ruleId === "job-encryption",
      );

      expect(jobEncryptionCheck).toBeDefined();
      expect(jobEncryptionCheck?.status).toBe("pass");
      expect(jobEncryptionCheck?.affectedItems).toHaveLength(0);
    });

    it("fails when any job is unencrypted", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: false,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const jobEncryptionCheck = results.find(
        (r) => r.ruleId === "job-encryption",
      );

      expect(jobEncryptionCheck).toBeDefined();
      expect(jobEncryptionCheck?.status).toBe("fail");
      expect(jobEncryptionCheck?.title).toBe("Job Encryption Audit");
      expect(jobEncryptionCheck?.message).toContain("encryption");
      expect(jobEncryptionCheck?.message).toContain("Vault requires");
      expect(jobEncryptionCheck?.affectedItems).toContain("Job B");
      expect(jobEncryptionCheck?.affectedItems).not.toContain("Job A");
    });

    it("fails with multiple unencrypted jobs", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: false,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: false,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job C",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo3",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const jobEncryptionCheck = results.find(
        (r) => r.ruleId === "job-encryption",
      );

      expect(jobEncryptionCheck?.status).toBe("fail");
      expect(jobEncryptionCheck?.affectedItems).toHaveLength(2);
      expect(jobEncryptionCheck?.affectedItems).toContain("Job A");
      expect(jobEncryptionCheck?.affectedItems).toContain("Job B");
    });

    it("passes with empty jobInfo array", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const jobEncryptionCheck = results.find(
        (r) => r.ruleId === "job-encryption",
      );

      expect(jobEncryptionCheck?.status).toBe("pass");
    });
  });

  describe("Rule 4: AWS Workload Check", () => {
    it("passes when no AWS workloads are present", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Replica",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const awsCheck = results.find((r) => r.ruleId === "aws-workload");

      expect(awsCheck).toBeDefined();
      expect(awsCheck?.status).toBe("pass");
      expect(awsCheck?.affectedItems).toHaveLength(0);
    });

    it("fails when AWS workload is detected", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "AWS Job",
            JobType: "Veeam.Vault.AWS",
            Encrypted: true,
            RepoName: "AWSRepo",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const awsCheck = results.find((r) => r.ruleId === "aws-workload");

      expect(awsCheck).toBeDefined();
      expect(awsCheck?.status).toBe("fail");
      expect(awsCheck?.title).toBe("AWS Workload Support");
      expect(awsCheck?.message).toContain("AWS");
      expect(awsCheck?.message).toContain("cannot target Vault directly");
      expect(awsCheck?.affectedItems).toContain("AWS Job");
    });

    it("detects AWS workload with case variations", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "AWS Backup Job",
            JobType: "veeam.vault.aws",
            Encrypted: true,
            RepoName: "AWSRepo",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const awsCheck = results.find((r) => r.ruleId === "aws-workload");

      expect(awsCheck?.status).toBe("fail");
      expect(awsCheck?.affectedItems).toContain("AWS Backup Job");
    });
  });

  describe("Rule 5b: Standalone Agent Workloads (agent-standalone-unsupported)", () => {
    function makeStandaloneData(
      jobSummary: NormalizedDataset["jobSummary"],
    ): NormalizedDataset {
      return {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary,
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };
    }

    function makeStandaloneDataWithJobs(
      jobSummary: NormalizedDataset["jobSummary"],
      jobInfo: NormalizedDataset["jobInfo"],
    ): NormalizedDataset {
      return {
        backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo,
        Licenses: [],
        jobSummary,
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };
    }

    function makeJobRow(
      overrides: Partial<NormalizedDataset["jobInfo"][number]> = {},
    ): NormalizedDataset["jobInfo"][number] {
      return {
        JobName: "TestJob",
        JobType: "Backup",
        Encrypted: true,
        RepoName: "Repo1",
        RetainDays: null,
        GfsDetails: null,
        SourceSizeGB: null,
        OnDiskGB: null,
        RetentionScheme: null,
        CompressionLevel: null,
        BlockSize: null,
        GfsEnabled: null,
        ActiveFullEnabled: null,
        SyntheticFullEnabled: null,
        BackupChainType: null,
        IndexingEnabled: null,
        ...overrides,
      };
    }

    it("passes when jobSummary is empty", () => {
      const data = makeStandaloneData([]);

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check).toBeDefined();
      expect(check?.status).toBe("pass");
      expect(check?.affectedItems).toHaveLength(0);
    });

    it("fails when jobSummary contains an Unmanaged Agent row with Count > 0", () => {
      const data = makeStandaloneData([
        { JobType: "Unmanaged Agent", Count: 1 },
      ]);

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.affectedItems).toEqual([]);
      expect(check?.message).toContain("1 standalone");
      expect(check?.message).toContain("Backup Copy");
    });

    it("passes when jobSummary contains a managed agent type (Agent Backup)", () => {
      const data = makeStandaloneData([{ JobType: "Agent Backup", Count: 2 }]);

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("pass");
      expect(check?.affectedItems).toHaveLength(0);
    });

    it("passes when Unmanaged Agent row has Count of 0", () => {
      const data = makeStandaloneData([
        { JobType: "Unmanaged Agent", Count: 0 },
      ]);

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("pass");
    });

    it("detects unmanaged agents case-insensitively", () => {
      const data = makeStandaloneData([
        { JobType: "unmanaged agent", Count: 1 },
      ]);

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.message).toContain("1 standalone");
    });

    it("fails when jobSummary has 'Windows Agent Standalone' (new-format, count-only fallback)", () => {
      const data = makeStandaloneData([
        { JobType: "Windows Agent Standalone", Count: 3 },
      ]);

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.affectedItems).toEqual([]);
      expect(check?.message).toContain("3 standalone");
      expect(check?.message).toContain("jobs detected");
    });

    it("fails with named affectedItems when jobInfo has 'Windows Agent Standalone' rows", () => {
      const data = makeStandaloneDataWithJobs(
        [],
        [
          makeJobRow({
            JobName: "Unmanaged-WindowsAgents-VTESTVM03",
            JobType: "Windows Agent Standalone",
          }),
          makeJobRow({
            JobName: "Unmanaged-WindowsAgents-VTESTVM04",
            JobType: "Windows Agent Standalone",
          }),
        ],
      );

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.affectedItems).toEqual([
        "Unmanaged-WindowsAgents-VTESTVM03",
        "Unmanaged-WindowsAgents-VTESTVM04",
      ]);
      expect(check?.message).toContain("2 standalone");
    });

    it("uses singular grammar when exactly one standalone job is in jobInfo", () => {
      const data = makeStandaloneDataWithJobs(
        [],
        [
          makeJobRow({
            JobName: "Unmanaged-WindowsAgents-Solo",
            JobType: "Linux Agent Standalone",
          }),
        ],
      );

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.message).toContain("1 standalone");
      expect(check?.message).toContain("job detected");
    });

    it("when both sources have standalone matches, jobInfo wins (same-data assumption)", () => {
      // In real healthchecks, jobInfo and jobSummary describe the same
      // standalone agents in two views. This synthetic case (legacy
      // summary + new-format jobInfo) doesn't occur in practice, but
      // pins down the precedence so future regressions are caught.
      const data = makeStandaloneDataWithJobs(
        [{ JobType: "Unmanaged Agent", Count: 9 }],
        [
          makeJobRow({
            JobName: "NamedStandaloneJob",
            JobType: "Windows Agent Standalone",
          }),
        ],
      );

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.affectedItems).toEqual(["NamedStandaloneJob"]);
      // The legacy summary count (9) is ignored; the message reports only
      // the jobInfo count (1). Pin this exactly so a future sum-both
      // refactor that double-counts would fail the assertion.
      expect(check?.message).toMatch(/^1 standalone /);
      expect(check?.message).not.toContain("9");
      expect(check?.message).not.toContain("10");
    });
  });

  describe("Rule 5c: Managed Agent Policies (agent-policy-gateway-required)", () => {
    it("passes when no policy job types are present", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check).toBeDefined();
      expect(check?.status).toBe("pass");
    });

    it("warns when EpAgentPolicy or VmbApiPolicyTempJob jobs are present (case-insensitive)", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "PolicyJob1",
            JobType: "EpAgentPolicy",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "PolicyJob2",
            JobType: "vmbapipolicytempjob",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check?.status).toBe("warning");
      expect(check?.affectedItems).toEqual(["PolicyJob1", "PolicyJob2"]);
      expect(check?.message).toContain("Gateway Server");
    });

    it("does not fire for managed agent backup JobTypes", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      try {
        const data: NormalizedDataset = {
          backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
          securitySummary: [
            {
              BackupFileEncryptionEnabled: true,
              ConfigBackupEncryptionEnabled: true,
            },
          ],
          jobInfo: [
            {
              JobName: "Job A",
              JobType: "Agent Backup",
              Encrypted: true,
              RepoName: "Repo1",
              RetainDays: null,
              GfsDetails: null,
              SourceSizeGB: null,
              OnDiskGB: null,
              RetentionScheme: null,
              CompressionLevel: null,
              BlockSize: null,
              GfsEnabled: null,
              ActiveFullEnabled: null,
              SyntheticFullEnabled: null,
              BackupChainType: null,
              IndexingEnabled: null,
            },
            {
              JobName: "Job B",
              JobType: "EpAgentBackup",
              Encrypted: true,
              RepoName: "Repo2",
              RetainDays: null,
              GfsDetails: null,
              SourceSizeGB: null,
              OnDiskGB: null,
              RetentionScheme: null,
              CompressionLevel: null,
              BlockSize: null,
              GfsEnabled: null,
              ActiveFullEnabled: null,
              SyntheticFullEnabled: null,
              BackupChainType: null,
              IndexingEnabled: null,
            },
          ],
          Licenses: [],
          jobSummary: [],
          dataErrors: [],
          jobSessionSummary: [],
          sobr: [],
          capExtents: [],
          extents: [],
          archExtents: [],
          repos: [],
        };

        const results = validateHealthcheck(data);
        const check = results.find(
          (r) => r.ruleId === "agent-policy-gateway-required",
        );

        expect(check?.status).toBe("pass");
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("warns when a job has 'Windows Agent Policy' as JobType (new format)", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Managed-WindowsAgents-Policy",
            JobType: "Windows Agent Policy",
            Encrypted: true,
            RepoName: "BackupRepo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check?.status).toBe("warning");
      expect(check?.affectedItems).toEqual(["Managed-WindowsAgents-Policy"]);
    });

    it("matches 'Linux Agent Policy' via platform-agnostic pattern", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "LinuxPolicy",
            JobType: "Linux Agent Policy",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check?.status).toBe("warning");
      expect(check?.affectedItems).toEqual(["LinuxPolicy"]);
    });
  });

  describe("Rule 6: License/Edition Check", () => {
    it("reports info when Community edition is detected", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [{ Edition: "Community", Status: "Active" }],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const licenseCheck = results.find((r) => r.ruleId === "license-edition");

      expect(licenseCheck).toBeDefined();
      expect(licenseCheck?.status).toBe("info");
      expect(licenseCheck?.title).toBe("License/Edition Notes");
      expect(licenseCheck?.message).toContain("Vault is fully supported");
      expect(licenseCheck?.message).toContain("Scale-Out Backup Repository");
      expect(licenseCheck?.affectedItems).toContain("Community");
    });

    it("reports info when Free edition is detected", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [{ Edition: "Free", Status: "Active" }],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const licenseCheck = results.find((r) => r.ruleId === "license-edition");

      expect(licenseCheck?.status).toBe("info");
      expect(licenseCheck?.affectedItems).toContain("Free");
    });

    it("passes when no Community or Free editions are present", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [{ Edition: "Enterprise", Status: "Active" }],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const licenseCheck = results.find((r) => r.ruleId === "license-edition");

      expect(licenseCheck?.status).toBe("pass");
      expect(licenseCheck?.affectedItems).toHaveLength(0);
    });

    it("passes with empty Licenses array", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const licenseCheck = results.find((r) => r.ruleId === "license-edition");

      expect(licenseCheck?.status).toBe("pass");
    });
  });

  describe("Rule 7: Retention Period Check", () => {
    it("passes when all jobs have RetainDays >= 30", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: 30,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: 90,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const retentionCheck = results.find(
        (r) => r.ruleId === "retention-period",
      );

      expect(retentionCheck).toBeDefined();
      expect(retentionCheck?.status).toBe("pass");
      expect(retentionCheck?.affectedItems).toHaveLength(0);
    });

    it("warns when some jobs have RetainDays < 30", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: 7,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: 14,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const retentionCheck = results.find(
        (r) => r.ruleId === "retention-period",
      );

      expect(retentionCheck).toBeDefined();
      expect(retentionCheck?.status).toBe("warning");
      expect(retentionCheck?.title).toBe("Retention Period");
      expect(retentionCheck?.message).toContain("30-day minimum");
      expect(retentionCheck?.affectedItems).toHaveLength(2);
      expect(retentionCheck?.affectedItems).toContain("Job A (7 days)");
      expect(retentionCheck?.affectedItems).toContain("Job B (14 days)");
    });

    it("passes when all jobs have RetainDays: null", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const retentionCheck = results.find(
        (r) => r.ruleId === "retention-period",
      );

      expect(retentionCheck?.status).toBe("pass");
      expect(retentionCheck?.affectedItems).toHaveLength(0);
    });

    it("warns only for jobs with RetainDays < 30, ignoring null values", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: 7,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job C",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo3",
            RetainDays: 60,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const retentionCheck = results.find(
        (r) => r.ruleId === "retention-period",
      );

      expect(retentionCheck?.status).toBe("warning");
      expect(retentionCheck?.affectedItems).toHaveLength(1);
      expect(retentionCheck?.affectedItems).toContain("Job A (7 days)");
    });

    it("passes when jobs have exactly 30 days retention", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: 30,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const retentionCheck = results.find(
        (r) => r.ruleId === "retention-period",
      );

      expect(retentionCheck?.status).toBe("pass");
      expect(retentionCheck?.affectedItems).toHaveLength(0);
    });

    it("warns when a job has RetainDays: 0", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: 0,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const retentionCheck = results.find(
        (r) => r.ruleId === "retention-period",
      );

      expect(retentionCheck?.status).toBe("warning");
      expect(retentionCheck?.affectedItems).toContain("Job A (0 days)");
    });
  });

  describe("All Rules Integration", () => {
    it("returns results for all 12 rules", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);

      expect(results).toHaveLength(13);
      expect(results.map((r) => r.ruleId)).toContain("vbr-version");
      expect(results.map((r) => r.ruleId)).toContain(
        "config-backup-encryption",
      );
      expect(results.map((r) => r.ruleId)).toContain("job-encryption");
      expect(results.map((r) => r.ruleId)).toContain("aws-workload");
      expect(results.map((r) => r.ruleId)).toContain(
        "agent-standalone-unsupported",
      );
      expect(results.map((r) => r.ruleId)).toContain(
        "agent-policy-gateway-required",
      );
      expect(results.map((r) => r.ruleId)).toContain("license-edition");
      expect(results.map((r) => r.ruleId)).toContain("retention-period");
      expect(results.map((r) => r.ruleId)).toContain("sobr-cap-encryption");
      expect(results.map((r) => r.ruleId)).toContain("sobr-immutability");
      expect(results.map((r) => r.ruleId)).toContain("archive-tier-edition");
      expect(results.map((r) => r.ruleId)).toContain("capacity-tier-residency");
      expect(results.map((r) => r.ruleId)).toContain("active-full-enabled");
    });

    it("handles empty dataset gracefully", () => {
      const data: NormalizedDataset = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
        jobSummary: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);

      expect(results).toHaveLength(13);
      // Version check should fail with empty backupServer
      const versionCheck = results.find((r) => r.ruleId === "vbr-version");
      expect(versionCheck?.status).toBe("fail");
    });
  });
});

describe("validateHealthcheck — legacy job type deprecation warning", () => {
  function emptyDataset(): NormalizedDataset {
    return {
      backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: true,
          ConfigBackupEncryptionEnabled: true,
        },
      ],
      jobInfo: [],
      Licenses: [],
      jobSummary: [],
      dataErrors: [],
      jobSessionSummary: [],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      repos: [],
    };
  }

  function jobRow(
    overrides: Partial<NormalizedDataset["jobInfo"][number]> = {},
  ): NormalizedDataset["jobInfo"][number] {
    return {
      JobName: "Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo",
      RetainDays: null,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: null,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: null,
      ActiveFullEnabled: null,
      SyntheticFullEnabled: null,
      BackupChainType: null,
      IndexingEnabled: null,
      ...overrides,
    };
  }

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("emits one console.warn when jobInfo contains a legacy JobType", () => {
    const data = emptyDataset();
    data.jobInfo = [jobRow({ JobName: "P", JobType: "EpAgentPolicy" })];

    validateHealthcheck(data);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Legacy agent job type strings");
  });

  it("emits one console.warn when jobSummary contains a legacy JobType", () => {
    const data = emptyDataset();
    data.jobSummary = [{ JobType: "Unmanaged Agent", Count: 1 }];

    validateHealthcheck(data);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Legacy agent job type strings");
  });

  it("emits exactly one warn even when multiple legacy rows are present", () => {
    const data = emptyDataset();
    data.jobInfo = [
      jobRow({ JobName: "A", JobType: "EpAgentPolicy" }),
      jobRow({ JobName: "B", JobType: "VmbapiPolicyTempJob" }),
      jobRow({ JobName: "C", JobType: "EpAgentBackup" }),
    ];
    data.jobSummary = [{ JobType: "Unmanaged Agent", Count: 2 }];

    validateHealthcheck(data);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT warn when only new-format agent strings are present", () => {
    const data = emptyDataset();
    data.jobInfo = [
      jobRow({ JobName: "P", JobType: "Windows Agent Policy" }),
      jobRow({ JobName: "B", JobType: "Windows Agent Backup" }),
    ];
    data.jobSummary = [{ JobType: "Windows Agent Standalone", Count: 1 }];

    validateHealthcheck(data);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does NOT warn when no agent rows are present at all", () => {
    const data = emptyDataset();
    data.jobInfo = [jobRow({ JobName: "Regular", JobType: "Backup" })];

    validateHealthcheck(data);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("Rule 13: Active Full Warning", () => {
  function makeMinimalJob(
    name: string,
    activeFull: boolean | null,
  ): NormalizedDataset["jobInfo"][number] {
    return {
      JobName: name,
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: null,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: null,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: null,
      ActiveFullEnabled: activeFull,
      SyntheticFullEnabled: null,
      BackupChainType: null,
      IndexingEnabled: null,
    };
  }

  function baseDataset(jobs: NormalizedDataset["jobInfo"]): NormalizedDataset {
    return {
      backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: true,
          ConfigBackupEncryptionEnabled: true,
        },
      ],
      jobInfo: jobs,
      Licenses: [],
      jobSummary: [],
      dataErrors: [],
      jobSessionSummary: [],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      repos: [],
    };
  }

  it("passes when no jobs have ActiveFullEnabled true", () => {
    const data = baseDataset([makeMinimalJob("Job A", false)]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("pass");
    expect(rule?.affectedItems).toHaveLength(0);
  });

  it("passes when ActiveFullEnabled is null on all jobs", () => {
    const data = baseDataset([makeMinimalJob("Job A", null)]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("pass");
    expect(rule?.affectedItems).toHaveLength(0);
  });

  it("warns when one job has ActiveFullEnabled true", () => {
    const data = baseDataset([makeMinimalJob("Job A", true)]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("warning");
    expect(rule?.title).toBe("Active Full Backup Schedules");
    expect(rule?.message).toContain("Active Full");
    expect(rule?.message).toContain("Synthetic Full");
    expect(rule?.affectedItems).toEqual(["Job A"]);
  });

  it("warns for all affected jobs when multiple have ActiveFullEnabled true", () => {
    const data = baseDataset([
      makeMinimalJob("Job A", true),
      makeMinimalJob("Job B", false),
      makeMinimalJob("Job C", true),
    ]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toEqual(["Job A", "Job C"]);
    expect(rule?.affectedItems).not.toContain("Job B");
  });

  it("skips when jobInfo is empty", () => {
    const data = baseDataset([]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("skipped");
    expect(rule?.affectedItems).toHaveLength(0);
  });
});
