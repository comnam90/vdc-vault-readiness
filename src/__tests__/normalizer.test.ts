import { describe, it, expect } from "vitest";
import { normalizeHealthcheck } from "@/lib/normalizer";
import type {
  BackupServer,
  JobInfo,
  License,
  ParsedHealthcheckSections,
  SecuritySummary,
} from "@/types/healthcheck";

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
      jobSessionSummary: [],
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
          RetainDays: null,
          GfsDetails: null,
          SourceSizeGB: null,
        },
      ],
      Licenses: [],
      jobSessionSummary: [],
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
      jobSessionSummary: [],
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

  describe("null/undefined array elements", () => {
    it("drops null elements in jobInfo and logs data error", () => {
      const raw = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          null as unknown as JobInfo,
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
        field: "_row",
      });
    });

    it("drops undefined elements in backupServer and logs data error", () => {
      const raw = {
        backupServer: [
          undefined as unknown as BackupServer,
          { Version: "13.0.1.1071", Name: "ServerB" },
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
        field: "_row",
      });
    });

    it("drops null elements in securitySummary and logs data error", () => {
      const raw = {
        backupServer: [],
        securitySummary: [
          null as unknown as SecuritySummary,
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
        field: "_row",
      });
    });

    it("drops null elements in Licenses and logs data error", () => {
      const raw = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [
          null as unknown as License,
          { Edition: "Enterprise", Status: "Active" },
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
        field: "_row",
      });
    });
  });

  describe("RetainDays extraction", () => {
    it("parses valid numeric RetainDays string to number", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            RetainDays: "7",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo).toHaveLength(1);
      expect(result.jobInfo[0].RetainDays).toBe(7);
    });

    it("parses RetainDays with whitespace", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            RetainDays: " 14 ",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].RetainDays).toBe(14);
    });

    it("defaults RetainDays to null when empty string", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            RetainDays: "",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].RetainDays).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });

    it("defaults RetainDays to null when missing and logs no error", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].RetainDays).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });

    it("defaults RetainDays to null and logs DataError for non-numeric value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            RetainDays: "abc",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo).toHaveLength(1);
      expect(result.jobInfo[0].RetainDays).toBeNull();
      expect(result.dataErrors).toHaveLength(1);
      expect(result.dataErrors[0]).toMatchObject({
        level: "Data Error",
        section: "jobInfo",
        rowIndex: 0,
        field: "RetainDays",
      });
    });

    it("defaults RetainDays to null when null value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            RetainDays: null,
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].RetainDays).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });
  });

  describe("GfsDetails extraction", () => {
    it("extracts non-empty GfsDetails as raw string", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            GfsDetails: "Weekly:1,Monthly:1",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].GfsDetails).toBe("Weekly:1,Monthly:1");
    });

    it("defaults GfsDetails to null when empty string", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            GfsDetails: "",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].GfsDetails).toBeNull();
    });

    it("defaults GfsDetails to null when missing", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].GfsDetails).toBeNull();
    });

    it("trims whitespace from GfsDetails", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            GfsDetails: "  Weekly:1  ",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].GfsDetails).toBe("Weekly:1");
    });

    it("defaults GfsDetails to null when null value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            GfsDetails: null,
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].GfsDetails).toBeNull();
    });
  });

  describe("SourceSizeGB extraction", () => {
    it("parses valid numeric SourceSizeGB string to number", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            SourceSizeGB: "12.14",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo).toHaveLength(1);
      expect(result.jobInfo[0].SourceSizeGB).toBe(12.14);
    });

    it("parses SourceSizeGB with whitespace", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            SourceSizeGB: " 1024 ",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].SourceSizeGB).toBe(1024);
    });

    it("defaults SourceSizeGB to null when empty string", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            SourceSizeGB: "",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].SourceSizeGB).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });

    it("defaults SourceSizeGB to null when missing and logs no error", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].SourceSizeGB).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });

    it("defaults SourceSizeGB to null and logs DataError for non-numeric value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            SourceSizeGB: "abc",
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo).toHaveLength(1);
      expect(result.jobInfo[0].SourceSizeGB).toBeNull();
      expect(result.dataErrors).toHaveLength(1);
      expect(result.dataErrors[0]).toMatchObject({
        level: "Data Error",
        section: "jobInfo",
        rowIndex: 0,
        field: "SourceSizeGB",
      });
    });

    it("defaults SourceSizeGB to null when null value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: "True",
            RepoName: "Repo1",
            SourceSizeGB: null,
          },
        ],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobInfo[0].SourceSizeGB).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });
  });

  describe("jobSessionSummaryByJob normalization", () => {
    it("parses valid job session records", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "0.0065",
          AvgChangeRate: "66.15",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary).toHaveLength(1);
      expect(result.jobSessionSummary[0]).toEqual({
        JobName: "Job_53",
        MaxDataSize: 0.0065,
        AvgChangeRate: 66.15,
      });
    });

    it("parses multiple job session records", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "0.0065",
          AvgChangeRate: "66.15",
        },
        {
          JobName: "Job_54",
          MaxDataSize: "0.0082",
          AvgChangeRate: "1.43",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary).toHaveLength(2);
      expect(result.jobSessionSummary[0].JobName).toBe("Job_53");
      expect(result.jobSessionSummary[1].JobName).toBe("Job_54");
      expect(result.jobSessionSummary[1].MaxDataSize).toBe(0.0082);
      expect(result.jobSessionSummary[1].AvgChangeRate).toBe(1.43);
    });

    it("defaults MaxDataSize to null when empty string", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "",
          AvgChangeRate: "66.15",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary[0].MaxDataSize).toBeNull();
    });

    it("defaults AvgChangeRate to null when empty string", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "0.0065",
          AvgChangeRate: "",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary[0].AvgChangeRate).toBeNull();
    });

    it("defaults MaxDataSize to null and logs DataError for non-numeric value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "abc",
          AvgChangeRate: "66.15",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary[0].MaxDataSize).toBeNull();
      expect(result.dataErrors.some((e) => e.field === "MaxDataSize")).toBe(
        true,
      );
    });

    it("defaults AvgChangeRate to null and logs DataError for non-numeric value", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "0.0065",
          AvgChangeRate: "notanumber",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary[0].AvgChangeRate).toBeNull();
      expect(result.dataErrors.some((e) => e.field === "AvgChangeRate")).toBe(
        true,
      );
    });

    it("skips session records with missing JobName", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: null,
          MaxDataSize: "0.0065",
          AvgChangeRate: "66.15",
        },
        {
          JobName: "Job_54",
          MaxDataSize: "0.0082",
          AvgChangeRate: "1.43",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary).toHaveLength(1);
      expect(result.jobSessionSummary[0].JobName).toBe("Job_54");
      expect(
        result.dataErrors.some(
          (e) =>
            e.section === "jobSessionSummaryByJob" && e.field === "JobName",
        ),
      ).toBe(true);
    });

    it("returns empty array when sessionData is undefined", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw);

      expect(result.jobSessionSummary).toEqual([]);
    });

    it("returns empty array when sessionData is empty", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const result = normalizeHealthcheck(raw, []);

      expect(result.jobSessionSummary).toEqual([]);
    });

    it("skips non-object elements in sessionData", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        null as unknown as Record<string, string | null | undefined>,
        {
          JobName: "Job_54",
          MaxDataSize: "0.0082",
          AvgChangeRate: "1.43",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary).toHaveLength(1);
      expect(result.jobSessionSummary[0].JobName).toBe("Job_54");
      expect(
        result.dataErrors.some(
          (e) => e.section === "jobSessionSummaryByJob" && e.field === "_row",
        ),
      ).toBe(true);
    });

    it("handles MaxDataSize and AvgChangeRate with null values", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: null,
          AvgChangeRate: null,
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary[0].MaxDataSize).toBeNull();
      expect(result.jobSessionSummary[0].AvgChangeRate).toBeNull();
      expect(result.dataErrors).toHaveLength(0);
    });

    it("filters out 'Total' summary rows to prevent double-counting", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "0.0065",
          AvgChangeRate: "66.15",
        },
        {
          JobName: "Total",
          MaxDataSize: "0.0065",
          AvgChangeRate: "33.08",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary).toHaveLength(1);
      expect(result.jobSessionSummary[0].JobName).toBe("Job_53");
    });

    it("filters 'Total' summary rows case-insensitively", () => {
      const raw: ParsedHealthcheckSections = {
        backupServer: [],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
      };

      const sessionData = [
        {
          JobName: "Job_53",
          MaxDataSize: "0.0065",
          AvgChangeRate: "66.15",
        },
        {
          JobName: "total",
          MaxDataSize: "0.0130",
          AvgChangeRate: "50.00",
        },
        {
          JobName: "TOTAL",
          MaxDataSize: "0.0130",
          AvgChangeRate: "50.00",
        },
      ];

      const result = normalizeHealthcheck(raw, sessionData);

      expect(result.jobSessionSummary).toHaveLength(1);
      expect(result.jobSessionSummary[0].JobName).toBe("Job_53");
    });
  });
});
