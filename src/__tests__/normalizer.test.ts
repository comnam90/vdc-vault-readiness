import { describe, it, expect } from "vitest";
import { normalizeHealthcheck } from "@/lib/normalizer";
import type { ParsedHealthcheckSections } from "@/types/healthcheck";

describe("normalizeHealthcheck", () => {
  it("converts boolean strings to booleans", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: "True",
          ConfigBackupEncryptionEnabled: "False",
        },
      ],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo1",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "False",
          RepoName: "Repo2",
        },
      ],
      Licenses: [{ Edition: "Enterprise", Status: "Active" }],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo[0].Encrypted).toBe(true);
    expect(result.jobInfo[1].Encrypted).toBe(false);
    expect(result.securitySummary[0].BackupFileEncryptionEnabled).toBe(true);
    expect(result.securitySummary[0].ConfigBackupEncryptionEnabled).toBe(false);
  });

  it("drops jobs missing required fields and logs data errors", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: "True",
          ConfigBackupEncryptionEnabled: "True",
        },
      ],
      jobInfo: [
        {
          JobName: null,
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo1",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo2",
        },
      ],
      Licenses: [{ Edition: "Enterprise", Status: "Active" }],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "JobName",
    });
  });

  it("defaults to empty arrays when sections are empty", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result).toEqual({
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
      dataErrors: [],
    });
  });

  it("handles missing sections by defaulting to empty arrays", () => {
    const raw: Partial<ParsedHealthcheckSections> = {
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo1",
        },
      ],
    };

    const result = normalizeHealthcheck(raw as ParsedHealthcheckSections);

    expect(result).toEqual({
      backupServer: [],
      securitySummary: [],
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
    });
  });
});
