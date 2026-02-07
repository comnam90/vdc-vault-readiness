import { describe, it, expect } from "vitest";
import { analyzeHealthcheck } from "@/lib/pipeline";
import type { HealthcheckRoot } from "@/types/healthcheck";
import type { ValidationStatus } from "@/types/validation";
import sampleData from "../../veeam-healthcheck.example.json";

/**
 * Helper to find a validation result by ruleId from the analysis output.
 */
function findRule(
  results: ReturnType<typeof analyzeHealthcheck>["validations"],
  ruleId: string,
) {
  const rule = results.find((r) => r.ruleId === ruleId);
  if (!rule) {
    throw new Error(`Rule "${ruleId}" not found in results`);
  }
  return rule;
}

describe("analyzeHealthcheck (full pipeline)", () => {
  describe("with sample healthcheck JSON", () => {
    const result = analyzeHealthcheck(sampleData as HealthcheckRoot);

    it("returns normalized data and validation results", () => {
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("validations");
      expect(result.validations).toHaveLength(6);
    });

    it("parses the backup server from Headers/Rows", () => {
      expect(result.data.backupServer).toHaveLength(1);
      expect(result.data.backupServer[0].Name).toBe("Server_1");
      expect(result.data.backupServer[0].Version).toBe("13.0.1.1071");
    });

    it("parses the security summary from Headers/Rows", () => {
      expect(result.data.securitySummary).toHaveLength(1);
      expect(result.data.securitySummary[0].BackupFileEncryptionEnabled).toBe(
        true,
      );
      expect(result.data.securitySummary[0].ConfigBackupEncryptionEnabled).toBe(
        true,
      );
    });

    it("parses all 20 jobs from Headers/Rows", () => {
      expect(result.data.jobInfo).toHaveLength(20);
    });

    it("normalizes job fields correctly", () => {
      const firstJob = result.data.jobInfo[0];
      expect(firstJob).toHaveProperty("JobName");
      expect(firstJob).toHaveProperty("JobType");
      expect(firstJob).toHaveProperty("Encrypted");
      expect(firstJob).toHaveProperty("RepoName");
      expect(typeof firstJob.Encrypted).toBe("boolean");
    });

    it("parses Licenses directly (not from Headers/Rows)", () => {
      expect(result.data.Licenses).toHaveLength(1);
      expect(result.data.Licenses[0].Edition).toBe("EnterprisePlus");
      expect(result.data.Licenses[0].Status).toBe("Valid");
    });

    it("produces no data errors on well-formed input", () => {
      expect(result.data.dataErrors).toHaveLength(0);
    });

    // Rule 1: VBR Version - 13.0.1.1071 >= 12.1.2 → pass
    it("passes VBR version check (13.0.1.1071 >= 12.1.2)", () => {
      const rule = findRule(result.validations, "vbr-version");
      expect(rule.status).toBe("pass");
    });

    // Rule 2: Global Encryption - both True → pass
    it("passes global encryption check (both flags True)", () => {
      const rule = findRule(result.validations, "global-encryption");
      expect(rule.status).toBe("pass");
    });

    // Rule 3: Job Encryption - 16 unencrypted → fail
    it("fails job encryption audit with 16 unencrypted jobs", () => {
      const rule = findRule(result.validations, "job-encryption");
      expect(rule.status).toBe("fail");
      expect(rule.affectedItems).toHaveLength(16);
    });

    // Rule 4: AWS Workloads - no AWS job types → pass
    it("passes AWS workload check (no AWS job types present)", () => {
      const rule = findRule(result.validations, "aws-workload");
      expect(rule.status).toBe("pass");
    });

    // Rule 5: Agent Workloads - EpAgentBackup/EpAgentPolicy → warning
    it("warns on agent workloads (EpAgentBackup, EpAgentPolicy)", () => {
      const rule = findRule(result.validations, "agent-workload");
      expect(rule.status).toBe("warning");
      expect(rule.affectedItems.length).toBeGreaterThan(0);
    });

    // Rule 6: License Edition - EnterprisePlus → pass
    it("passes license edition check (EnterprisePlus)", () => {
      const rule = findRule(result.validations, "license-edition");
      expect(rule.status).toBe("pass");
    });
  });

  describe("with minimal valid input", () => {
    it("handles empty Sections gracefully", () => {
      const input: HealthcheckRoot = {
        Sections: {},
      };

      const result = analyzeHealthcheck(input);

      expect(result.data.backupServer).toEqual([]);
      expect(result.data.securitySummary).toEqual([]);
      expect(result.data.jobInfo).toEqual([]);
      expect(result.data.Licenses).toEqual([]);
      expect(result.validations).toHaveLength(6);
    });

    it("handles missing Sections key gracefully", () => {
      const input = {} as HealthcheckRoot;

      const result = analyzeHealthcheck(input);

      expect(result.data.backupServer).toEqual([]);
      expect(result.data.jobInfo).toEqual([]);
      expect(result.validations).toHaveLength(6);
    });
  });

  describe("end-to-end validation scenarios", () => {
    it("detects old VBR version through the full pipeline", () => {
      const input: HealthcheckRoot = {
        Sections: {
          backupServer: {
            Headers: ["Name", "Version"],
            Rows: [["OldServer", "11.0.0.100"]],
          },
        },
      };

      const result = analyzeHealthcheck(input);
      const rule = findRule(result.validations, "vbr-version");

      expect(rule.status).toBe("fail");
      expect(rule.affectedItems).toContain("OldServer");
    });

    it("detects unencrypted jobs through the full pipeline", () => {
      const input: HealthcheckRoot = {
        Sections: {
          backupServer: {
            Headers: ["Name", "Version"],
            Rows: [["Server1", "13.0.0.1"]],
          },
          jobInfo: {
            Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
            Rows: [
              ["EncryptedJob", "Backup", "True", "Repo1"],
              ["PlainJob", "Backup", "False", "Repo2"],
            ],
          },
        },
      };

      const result = analyzeHealthcheck(input);
      const rule = findRule(result.validations, "job-encryption");

      expect(rule.status).toBe("fail");
      expect(rule.affectedItems).toEqual(["PlainJob"]);
    });

    it("detects agent jobs through the full pipeline", () => {
      const input: HealthcheckRoot = {
        Sections: {
          jobInfo: {
            Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
            Rows: [
              ["AgentJob1", "EpAgentBackup", "True", "Repo1"],
              ["RegularJob", "Backup", "True", "Repo2"],
            ],
          },
        },
      };

      const result = analyzeHealthcheck(input);
      const rule = findRule(result.validations, "agent-workload");

      expect(rule.status).toBe("warning");
      expect(rule.affectedItems).toEqual(["AgentJob1"]);
    });

    it("detects community license through the full pipeline", () => {
      const input: HealthcheckRoot = {
        Sections: {},
        Licenses: [{ Edition: "Community", Status: "Valid" }],
      };

      const result = analyzeHealthcheck(input);
      const rule = findRule(result.validations, "license-edition");

      expect(rule.status).toBe("info");
      expect(rule.affectedItems).toContain("Community");
    });

    it("detects disabled global encryption through the full pipeline", () => {
      const input: HealthcheckRoot = {
        Sections: {
          securitySummary: {
            Headers: [
              "BackupFileEncryptionEnabled",
              "ConfigBackupEncryptionEnabled",
            ],
            Rows: [["True", "False"]],
          },
        },
      };

      const result = analyzeHealthcheck(input);
      const rule = findRule(result.validations, "global-encryption");

      expect(rule.status).toBe("warning");
    });

    it("reports all-pass when everything is compliant", () => {
      const input: HealthcheckRoot = {
        Sections: {
          backupServer: {
            Headers: ["Name", "Version"],
            Rows: [["GoodServer", "13.0.1.1071"]],
          },
          securitySummary: {
            Headers: [
              "BackupFileEncryptionEnabled",
              "ConfigBackupEncryptionEnabled",
            ],
            Rows: [["True", "True"]],
          },
          jobInfo: {
            Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
            Rows: [["SecureJob", "Backup", "True", "Repo1"]],
          },
        },
        Licenses: [{ Edition: "EnterprisePlus", Status: "Valid" }],
      };

      const result = analyzeHealthcheck(input);
      const statuses = result.validations.map((r) => r.status);

      expect(statuses.every((s: ValidationStatus) => s === "pass")).toBe(true);
      expect(result.data.dataErrors).toHaveLength(0);
    });
  });
});
