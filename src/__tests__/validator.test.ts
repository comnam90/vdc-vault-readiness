import { describe, it, expect } from "vitest";
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
        dataErrors: [],
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
        dataErrors: [],
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
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const versionCheck = results.find((r) => r.ruleId === "vbr-version");

      expect(versionCheck?.status).toBe("pass");
    });
  });

  describe("Rule 2: Global Encryption Check", () => {
    it("passes when both encryption flags are true", () => {
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
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const encryptionCheck = results.find(
        (r) => r.ruleId === "global-encryption",
      );

      expect(encryptionCheck).toBeDefined();
      expect(encryptionCheck?.status).toBe("pass");
    });

    it("warns when BackupFileEncryptionEnabled is false", () => {
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
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const encryptionCheck = results.find(
        (r) => r.ruleId === "global-encryption",
      );

      expect(encryptionCheck).toBeDefined();
      expect(encryptionCheck?.status).toBe("warning");
      expect(encryptionCheck?.title).toBe("Global Encryption Configuration");
      expect(encryptionCheck?.message).toContain("encryption");
      expect(encryptionCheck?.message).toContain("Vault requires");
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
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const encryptionCheck = results.find(
        (r) => r.ruleId === "global-encryption",
      );

      expect(encryptionCheck?.status).toBe("warning");
    });

    it("warns when both encryption flags are false", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: false,
            ConfigBackupEncryptionEnabled: false,
          },
        ],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const encryptionCheck = results.find(
        (r) => r.ruleId === "global-encryption",
      );

      expect(encryptionCheck?.status).toBe("warning");
    });

    it("passes with empty securitySummary array", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const encryptionCheck = results.find(
        (r) => r.ruleId === "global-encryption",
      );

      expect(encryptionCheck?.status).toBe("pass");
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
          },
          {
            JobName: "Job B",
            JobType: "Replica",
            Encrypted: true,
            RepoName: "Repo2",
          },
        ],
        Licenses: [],
        dataErrors: [],
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
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: false,
            RepoName: "Repo2",
          },
        ],
        Licenses: [],
        dataErrors: [],
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
          },
          {
            JobName: "Job B",
            JobType: "Backup",
            Encrypted: false,
            RepoName: "Repo2",
          },
          {
            JobName: "Job C",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo3",
          },
        ],
        Licenses: [],
        dataErrors: [],
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
        dataErrors: [],
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
          },
          {
            JobName: "Job B",
            JobType: "Replica",
            Encrypted: true,
            RepoName: "Repo2",
          },
        ],
        Licenses: [],
        dataErrors: [],
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
          },
          {
            JobName: "AWS Job",
            JobType: "Veeam.Vault.AWS",
            Encrypted: true,
            RepoName: "AWSRepo",
          },
        ],
        Licenses: [],
        dataErrors: [],
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
          },
        ],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const awsCheck = results.find((r) => r.ruleId === "aws-workload");

      expect(awsCheck?.status).toBe("fail");
      expect(awsCheck?.affectedItems).toContain("AWS Backup Job");
    });
  });

  describe("Rule 5: Agent Workload Check", () => {
    it("passes when no agent workloads are present", () => {
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
          },
        ],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const agentCheck = results.find((r) => r.ruleId === "agent-workload");

      expect(agentCheck).toBeDefined();
      expect(agentCheck?.status).toBe("pass");
      expect(agentCheck?.affectedItems).toHaveLength(0);
    });

    it("warns when agent workload is detected", () => {
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
            JobName: "Agent Job",
            JobType: "EpAgentBackup",
            Encrypted: true,
            RepoName: "Repo1",
          },
        ],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const agentCheck = results.find((r) => r.ruleId === "agent-workload");

      expect(agentCheck).toBeDefined();
      expect(agentCheck?.status).toBe("warning");
      expect(agentCheck?.title).toBe("Agent Workload Configuration");
      expect(agentCheck?.message).toContain("Agent");
      expect(agentCheck?.message).toContain("Gateway Server");
      expect(agentCheck?.affectedItems).toContain("Agent Job");
    });

    it("detects various agent job type patterns", () => {
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
          },
          {
            JobName: "Job B",
            JobType: "EpAgentPolicy",
            Encrypted: true,
            RepoName: "Repo2",
          },
          {
            JobName: "Job C",
            JobType: "agentbackup",
            Encrypted: true,
            RepoName: "Repo3",
          },
        ],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);
      const agentCheck = results.find((r) => r.ruleId === "agent-workload");

      expect(agentCheck?.status).toBe("warning");
      expect(agentCheck?.affectedItems).toHaveLength(3);
      expect(agentCheck?.affectedItems).toContain("Job A");
      expect(agentCheck?.affectedItems).toContain("Job B");
      expect(agentCheck?.affectedItems).toContain("Job C");
    });
  });

  describe("All Rules Integration", () => {
    it("returns results for all 5 rules", () => {
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
          },
        ],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);

      expect(results).toHaveLength(5);
      expect(results.map((r) => r.ruleId)).toContain("vbr-version");
      expect(results.map((r) => r.ruleId)).toContain("global-encryption");
      expect(results.map((r) => r.ruleId)).toContain("job-encryption");
      expect(results.map((r) => r.ruleId)).toContain("aws-workload");
      expect(results.map((r) => r.ruleId)).toContain("agent-workload");
    });

    it("handles empty dataset gracefully", () => {
      const data: NormalizedDataset = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
      };

      const results = validateHealthcheck(data);

      expect(results).toHaveLength(5);
      // Version check should fail with empty backupServer
      const versionCheck = results.find((r) => r.ruleId === "vbr-version");
      expect(versionCheck?.status).toBe("fail");
    });
  });
});
