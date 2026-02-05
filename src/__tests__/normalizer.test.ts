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

    const result = normalizeHealthcheck(raw);

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

  it("defaults non-array sections to empty arrays", () => {
    const raw: Partial<ParsedHealthcheckSections> = JSON.parse(
      '{"jobInfo":{},"backupServer":"nope","securitySummary":0,"Licenses":{}}',
    );

    const result = normalizeHealthcheck(raw);

    expect(result).toEqual({
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
      dataErrors: [],
    });
  });

  it("drops backupServer entry missing Version field and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [
        {
          Version: null,
          Name: "ServerA",
        },
        {
          Version: "13.0.1.1071",
          Name: "ServerB",
        },
      ],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.backupServer).toHaveLength(1);
    expect(result.backupServer[0].Name).toBe("ServerB");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "backupServer",
      rowIndex: 0,
      field: "Version",
    });
  });

  it("drops backupServer entry missing Name field and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [
        {
          Version: "13.0.1.1071",
          Name: null,
        },
        {
          Version: "13.0.1.1071",
          Name: "ServerB",
        },
      ],
      securitySummary: [],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.backupServer).toHaveLength(1);
    expect(result.backupServer[0].Name).toBe("ServerB");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "backupServer",
      rowIndex: 0,
      field: "Name",
    });
  });

  it("drops securitySummary entry with invalid BackupFileEncryptionEnabled and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: "InvalidValue",
          ConfigBackupEncryptionEnabled: "True",
        },
        {
          BackupFileEncryptionEnabled: "True",
          ConfigBackupEncryptionEnabled: "False",
        },
      ],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.securitySummary).toHaveLength(1);
    expect(result.securitySummary[0].BackupFileEncryptionEnabled).toBe(true);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "securitySummary",
      rowIndex: 0,
      field: "BackupFileEncryptionEnabled",
    });
  });

  it("drops securitySummary entry with invalid ConfigBackupEncryptionEnabled and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: "True",
          ConfigBackupEncryptionEnabled: "MaybeTrue",
        },
        {
          BackupFileEncryptionEnabled: "False",
          ConfigBackupEncryptionEnabled: "True",
        },
      ],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.securitySummary).toHaveLength(1);
    expect(result.securitySummary[0].ConfigBackupEncryptionEnabled).toBe(true);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "securitySummary",
      rowIndex: 0,
      field: "ConfigBackupEncryptionEnabled",
    });
  });

  it("drops securitySummary entry with missing BackupFileEncryptionEnabled and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: null,
          ConfigBackupEncryptionEnabled: "True",
        },
        {
          BackupFileEncryptionEnabled: "True",
          ConfigBackupEncryptionEnabled: "False",
        },
      ],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.securitySummary).toHaveLength(1);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "securitySummary",
      rowIndex: 0,
      field: "BackupFileEncryptionEnabled",
    });
  });

  it("drops Licenses entry missing Status field and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [
        {
          Edition: "Enterprise",
          Status: "",
        },
        {
          Edition: "Standard",
          Status: "Active",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.Licenses).toHaveLength(1);
    expect(result.Licenses[0].Edition).toBe("Standard");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "Licenses",
      rowIndex: 0,
      field: "Status",
    });
  });

  it("drops Licenses entry missing Edition field and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [],
      Licenses: [
        {
          Edition: "",
          Status: "Active",
        },
        {
          Edition: "Enterprise",
          Status: "Active",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.Licenses).toHaveLength(1);
    expect(result.Licenses[0].Edition).toBe("Enterprise");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "Licenses",
      rowIndex: 0,
      field: "Edition",
    });
  });

  it("drops securitySummary entry missing ConfigBackupEncryptionEnabled and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: "True",
          ConfigBackupEncryptionEnabled: null,
        },
        {
          BackupFileEncryptionEnabled: "False",
          ConfigBackupEncryptionEnabled: "True",
        },
      ],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.securitySummary).toHaveLength(1);
    expect(result.securitySummary[0].BackupFileEncryptionEnabled).toBe(false);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "securitySummary",
      rowIndex: 0,
      field: "ConfigBackupEncryptionEnabled",
    });
  });

  it("trims and lowercases boolean strings", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: " TRUE ",
          ConfigBackupEncryptionEnabled: "false",
        },
      ],
      jobInfo: [],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.securitySummary[0].BackupFileEncryptionEnabled).toBe(true);
    expect(result.securitySummary[0].ConfigBackupEncryptionEnabled).toBe(false);
  });

  it("drops jobs with invalid boolean values", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: "yes",
          RepoName: "Repo1",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo2",
        },
      ],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "Encrypted",
    });
  });

  it("trims and lowercases jobInfo Encrypted boolean", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: " TRUE ",
          RepoName: "Repo1",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: " false ",
          RepoName: "Repo2",
        },
      ],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(2);
    expect(result.jobInfo[0].Encrypted).toBe(true);
    expect(result.jobInfo[1].Encrypted).toBe(false);
    expect(result.dataErrors).toHaveLength(0);
  });

  it("drops jobs missing required JobType and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: null,
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
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "JobType",
    });
    expect(result.dataErrors[0].reason).toBeTruthy();
    expect(typeof result.dataErrors[0].reason).toBe("string");
  });

  it("drops jobs missing required RepoName and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: null,
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo2",
        },
      ],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "RepoName",
    });
  });

  it("drops jobs missing required Encrypted and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: null,
          RepoName: "Repo1",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo2",
        },
      ],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "Encrypted",
    });
  });

  it("drops jobs with blank JobType and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "",
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
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "JobType",
    });
  });

  it("drops jobs with blank RepoName and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "   ",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo2",
        },
      ],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "RepoName",
    });
  });

  it("drops jobs with blank Encrypted and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "Job A",
          JobType: "Backup",
          Encrypted: "",
          RepoName: "Repo1",
        },
        {
          JobName: "Job B",
          JobType: "Backup",
          Encrypted: "True",
          RepoName: "Repo2",
        },
      ],
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "Encrypted",
    });
  });

  it("drops jobs with blank JobName and logs data error", () => {
    const raw: ParsedHealthcheckSections = {
      backupServer: [],
      securitySummary: [],
      jobInfo: [
        {
          JobName: "",
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
      Licenses: [],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.jobInfo).toHaveLength(1);
    expect(result.jobInfo[0].JobName).toBe("Job B");
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      level: "Data Error",
      section: "jobInfo",
      rowIndex: 0,
      field: "JobName",
    });
  });
});
