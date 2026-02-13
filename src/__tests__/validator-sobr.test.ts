import { describe, it, expect } from "vitest";
import { validateHealthcheck } from "@/lib/validator";
import type { NormalizedDataset, SafeJob } from "@/types/domain";

/** Factory for a minimal SafeJob with overrides. */
function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "TestJob",
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
    ...overrides,
  };
}

/** Factory for a minimal NormalizedDataset with overrides. */
function makeDataset(
  overrides: Partial<NormalizedDataset> = {},
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
    Licenses: [{ Edition: "Enterprise Plus", Status: "Active" }],
    jobSessionSummary: [],
    sobr: [],
    capExtents: [],
    archExtents: [],
    dataErrors: [],
    ...overrides,
  };
}

function findRule(
  results: ReturnType<typeof validateHealthcheck>,
  ruleId: string,
) {
  return results.find((r) => r.ruleId === ruleId);
}

describe("validateJobEncryption (SOBR encryption exemption)", () => {
  it("exempts unencrypted job on SOBR with capacity tier", () => {
    const data = makeDataset({
      jobInfo: [
        makeJob({ JobName: "Job A", Encrypted: false, RepoName: "SOBR-01" }),
      ],
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: true,
          CapacityTierCopy: true,
          CapacityTierMove: false,
          ArchiveTierEnabled: false,
          ImmutableEnabled: false,
          ExtentCount: null,
          JobCount: null,
          PolicyType: null,
          UsePerVMFiles: null,
          CapTierType: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "job-encryption");

    expect(rule?.status).toBe("pass");
    expect(rule?.affectedItems).toHaveLength(0);
  });

  it("still fails for unencrypted job on SOBR without capacity tier", () => {
    const data = makeDataset({
      jobInfo: [
        makeJob({ JobName: "Job A", Encrypted: false, RepoName: "SOBR-01" }),
      ],
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: false,
          CapacityTierCopy: false,
          CapacityTierMove: false,
          ArchiveTierEnabled: false,
          ImmutableEnabled: false,
          ExtentCount: null,
          JobCount: null,
          PolicyType: null,
          UsePerVMFiles: null,
          CapTierType: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "job-encryption");

    expect(rule?.status).toBe("fail");
    expect(rule?.affectedItems).toContain("Job A");
  });

  it("still fails for unencrypted job on non-SOBR repo", () => {
    const data = makeDataset({
      jobInfo: [
        makeJob({
          JobName: "Job A",
          Encrypted: false,
          RepoName: "PlainRepo",
        }),
      ],
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: true,
          CapacityTierCopy: true,
          CapacityTierMove: false,
          ArchiveTierEnabled: false,
          ImmutableEnabled: false,
          ExtentCount: null,
          JobCount: null,
          PolicyType: null,
          UsePerVMFiles: null,
          CapTierType: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "job-encryption");

    expect(rule?.status).toBe("fail");
    expect(rule?.affectedItems).toContain("Job A");
  });

  it("mixed: only reports non-exempt unencrypted jobs", () => {
    const data = makeDataset({
      jobInfo: [
        makeJob({
          JobName: "Exempt Job",
          Encrypted: false,
          RepoName: "SOBR-01",
        }),
        makeJob({
          JobName: "Not Exempt",
          Encrypted: false,
          RepoName: "PlainRepo",
        }),
      ],
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: true,
          CapacityTierCopy: true,
          CapacityTierMove: false,
          ArchiveTierEnabled: false,
          ImmutableEnabled: false,
          ExtentCount: null,
          JobCount: null,
          PolicyType: null,
          UsePerVMFiles: null,
          CapTierType: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "job-encryption");

    expect(rule?.status).toBe("fail");
    expect(rule?.affectedItems).toEqual(["Not Exempt"]);
  });

  it("backward compatible: empty sobr array means no exemptions", () => {
    const data = makeDataset({
      jobInfo: [
        makeJob({
          JobName: "Job A",
          Encrypted: false,
          RepoName: "SOBR-01",
        }),
      ],
      sobr: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "job-encryption");

    expect(rule?.status).toBe("fail");
    expect(rule?.affectedItems).toContain("Job A");
  });
});

describe("validateCapTierEncryption (sobr-cap-encryption)", () => {
  it("passes when no cap extents exist", () => {
    const data = makeDataset({ capExtents: [] });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-cap-encryption");

    expect(rule?.status).toBe("pass");
  });

  it("passes when all cap extents have encryption enabled", () => {
    const data = makeDataset({
      capExtents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: true,
          ImmutableEnabled: true,
          Type: null,
          Status: null,
          CopyModeEnabled: null,
          MoveModeEnabled: null,
          MovePeriodDays: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-cap-encryption");

    expect(rule?.status).toBe("pass");
  });

  it("warns when any cap extent lacks encryption", () => {
    const data = makeDataset({
      capExtents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: false,
          ImmutableEnabled: true,
          Type: null,
          Status: null,
          CopyModeEnabled: null,
          MoveModeEnabled: null,
          MovePeriodDays: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-cap-encryption");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toEqual(["AzureBlob-01 (SOBR: SOBR-01)"]);
  });
});

describe("validateSobrImmutability (sobr-immutability)", () => {
  it("passes when no cap extents exist", () => {
    const data = makeDataset({ capExtents: [] });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-immutability");

    expect(rule?.status).toBe("pass");
  });

  it("passes when all cap extents are immutable", () => {
    const data = makeDataset({
      capExtents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: true,
          ImmutableEnabled: true,
          Type: null,
          Status: null,
          CopyModeEnabled: null,
          MoveModeEnabled: null,
          MovePeriodDays: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-immutability");

    expect(rule?.status).toBe("pass");
  });

  it("warns when any cap extent lacks immutability", () => {
    const data = makeDataset({
      capExtents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: true,
          ImmutableEnabled: false,
          Type: null,
          Status: null,
          CopyModeEnabled: null,
          MoveModeEnabled: null,
          MovePeriodDays: null,
          ImmutablePeriod: null,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-immutability");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toEqual(["AzureBlob-01 (SOBR: SOBR-01)"]);
    expect(rule?.message).toContain("immutability");
  });
});

describe("validateArchiveTierEdition (archive-tier-edition)", () => {
  it("passes when no archive extents exist", () => {
    const data = makeDataset({ archExtents: [] });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "archive-tier-edition");

    expect(rule?.status).toBe("pass");
  });

  it("passes when no archive extents are enabled", () => {
    const data = makeDataset({
      archExtents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: false,
          EncryptionEnabled: true,
          ImmutableEnabled: false,
          RetentionPeriod: null,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
          ImmutablePeriod: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "archive-tier-edition");

    expect(rule?.status).toBe("pass");
  });

  it("warns when any archive extent is enabled", () => {
    const data = makeDataset({
      archExtents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: true,
          EncryptionEnabled: true,
          ImmutableEnabled: false,
          RetentionPeriod: 90,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
          ImmutablePeriod: null,
        },
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "archive-tier-edition");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toEqual(["Archive-01 (SOBR: SOBR-01)"]);
    expect(rule?.message).toContain("Advanced");
  });
});

describe("validateCapacityTierResidency (capacity-tier-residency)", () => {
  /** Shorthand to build a SOBR with capacity tier enabled. */
  function makeSobr(overrides: Record<string, unknown> = {}) {
    return {
      Name: "SOBR-01",
      EnableCapacityTier: true,
      CapacityTierCopy: false,
      CapacityTierMove: true,
      ArchiveTierEnabled: false,
      ImmutableEnabled: false,
      ExtentCount: null,
      JobCount: null,
      PolicyType: null,
      UsePerVMFiles: null,
      CapTierType: null,
      ImmutablePeriod: null,
      SizeLimitEnabled: null,
      SizeLimit: null,
      ...overrides,
    };
  }

  /** Shorthand for cap extent. */
  function makeCapExtent(overrides: Record<string, unknown> = {}) {
    return {
      Name: "AzureBlob-01",
      SobrName: "SOBR-01",
      EncryptionEnabled: true,
      ImmutableEnabled: false,
      Type: null,
      Status: null,
      CopyModeEnabled: false,
      MoveModeEnabled: true,
      MovePeriodDays: 14,
      ImmutablePeriod: null,
      SizeLimitEnabled: null,
      SizeLimit: null,
      ...overrides,
    };
  }

  it("passes when no SOBRs exist", () => {
    const data = makeDataset({ sobr: [], capExtents: [] });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("pass");
  });

  it("passes: copy mode with sufficient retention", () => {
    const data = makeDataset({
      sobr: [makeSobr({ CapacityTierCopy: true, CapacityTierMove: false })],
      capExtents: [
        makeCapExtent({ CopyModeEnabled: true, MoveModeEnabled: false }),
      ],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 30 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("pass");
  });

  it("warns: copy mode with insufficient retention", () => {
    const data = makeDataset({
      sobr: [makeSobr({ CapacityTierCopy: true, CapacityTierMove: false })],
      capExtents: [
        makeCapExtent({ CopyModeEnabled: true, MoveModeEnabled: false }),
      ],
      jobInfo: [
        makeJob({ JobName: "ShortJob", RepoName: "SOBR-01", RetainDays: 20 }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems.length).toBeGreaterThan(0);
    expect(rule?.affectedItems[0]).toContain("ShortJob");
    expect(rule?.affectedItems[0]).toContain("20");
  });

  it("passes: move-only with sufficient retention", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [makeCapExtent({ MovePeriodDays: 7 })],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 37 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("pass");
  });

  it("warns: move-only with insufficient retention (residency = RetainDays - MovePeriodDays)", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [makeCapExtent({ MovePeriodDays: 14 })],
      jobInfo: [
        makeJob({ JobName: "ShortJob", RepoName: "SOBR-01", RetainDays: 30 }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems[0]).toContain("ShortJob");
    expect(rule?.affectedItems[0]).toContain("16");
  });

  it("skips normal check when RetainDays <= MovePeriodDays (never reaches capacity)", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [makeCapExtent({ MovePeriodDays: 14 })],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 10 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("pass");
  });

  it("warns: move-only GFS weekly insufficient", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [makeCapExtent({ MovePeriodDays: 14 })],
      jobInfo: [
        makeJob({
          JobName: "GfsJob",
          RepoName: "SOBR-01",
          RetainDays: 10,
          GfsEnabled: true,
          GfsDetails: "Weekly:3",
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    // Weekly: 3 * 7 = 21 days, arrivalDay = 14, residency = 7 days
    expect(rule?.affectedItems.some((i) => i.includes("GfsJob"))).toBe(true);
    expect(rule?.affectedItems.some((i) => i.includes("weekly"))).toBe(true);
  });

  it("warns: move-only GFS monthly insufficient", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [makeCapExtent({ MovePeriodDays: 14 })],
      jobInfo: [
        makeJob({
          JobName: "GfsJob",
          RepoName: "SOBR-01",
          RetainDays: 10,
          GfsEnabled: true,
          GfsDetails: "Monthly:1",
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    // Monthly: 1 * 30 = 30 days, arrivalDay = 14, residency = 16 days
    expect(rule?.affectedItems.some((i) => i.includes("GfsJob"))).toBe(true);
    expect(rule?.affectedItems.some((i) => i.includes("monthly"))).toBe(true);
  });

  it("warns: archive pulls data too early", () => {
    const data = makeDataset({
      sobr: [makeSobr({ ArchiveTierEnabled: true })],
      capExtents: [makeCapExtent({ MovePeriodDays: 14 })],
      archExtents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: true,
          EncryptionEnabled: true,
          ImmutableEnabled: false,
          RetentionPeriod: 20,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
          ImmutablePeriod: null,
        },
      ],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 60 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    // archRetentionPeriod=20, arrivalDay=14, archResidency=6 days
    expect(rule?.affectedItems.some((i) => i.includes("SOBR-01"))).toBe(true);
    expect(rule?.affectedItems.some((i) => i.includes("archive"))).toBe(true);
  });

  it("archive delayed by immutability (archRetentionPeriod < immutablePeriod)", () => {
    const data = makeDataset({
      sobr: [makeSobr({ ArchiveTierEnabled: true })],
      capExtents: [
        makeCapExtent({
          MovePeriodDays: 0,
          ImmutableEnabled: true,
          ImmutablePeriod: 60,
        }),
      ],
      archExtents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: true,
          EncryptionEnabled: true,
          ImmutableEnabled: false,
          RetentionPeriod: 20,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
          ImmutablePeriod: null,
        },
      ],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 90 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // archRetentionPeriod=20 but immutablePeriod=60, so effective archive trigger = max(20,60) = 60
    // archResidency = 60 - 0 = 60 >= 30: pass for archive
    expect(rule?.affectedItems.every((i) => !i.includes("archive"))).toBe(true);
  });

  it("immutability covers retention gap: warns with cost note", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [
        makeCapExtent({
          MovePeriodDays: 14,
          ImmutableEnabled: true,
          ImmutablePeriod: 30,
        }),
      ],
      jobInfo: [
        makeJob({ JobName: "ShortJob", RepoName: "SOBR-01", RetainDays: 30 }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // retentionResidency = 30 - 14 = 16, but immutability = 30 covers it
    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems[0]).toContain("ShortJob");
    expect(rule?.affectedItems[0]).toContain("immutability");
  });

  it("immutability insufficient to cover gap: warns without immutability note", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [
        makeCapExtent({
          MovePeriodDays: 14,
          ImmutableEnabled: true,
          ImmutablePeriod: 20,
        }),
      ],
      jobInfo: [
        makeJob({ JobName: "ShortJob", RepoName: "SOBR-01", RetainDays: 30 }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // retentionResidency = 16, immutability = 20, effective = 20 < 30
    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems[0]).toContain("ShortJob");
    expect(rule?.affectedItems[0]).not.toContain("immutability");
  });

  it("null MovePeriodDays treated as 0", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [
        makeCapExtent({
          MoveModeEnabled: true,
          CopyModeEnabled: false,
          MovePeriodDays: null,
        }),
      ],
      jobInfo: [
        makeJob({ JobName: "ShortJob", RepoName: "SOBR-01", RetainDays: 20 }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // arrivalDay = 0 (null treated as 0), residency = 20 < 30
    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems[0]).toContain("ShortJob");
    expect(rule?.affectedItems[0]).toContain("20");
  });

  it("null RetentionPeriod on archive skips archive check", () => {
    const data = makeDataset({
      sobr: [makeSobr({ ArchiveTierEnabled: true })],
      capExtents: [makeCapExtent({ MovePeriodDays: 0 })],
      archExtents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: true,
          EncryptionEnabled: true,
          ImmutableEnabled: false,
          RetentionPeriod: null,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
          ImmutablePeriod: null,
        },
      ],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 60 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // No archive residency issue because RetentionPeriod is null
    expect(rule?.affectedItems.every((i) => !i.includes("archive"))).toBe(true);
  });

  it("mixed: some jobs flagged, some not", () => {
    const data = makeDataset({
      sobr: [makeSobr()],
      capExtents: [makeCapExtent({ MovePeriodDays: 14 })],
      jobInfo: [
        makeJob({
          JobName: "ShortJob",
          RepoName: "SOBR-01",
          RetainDays: 30,
        }),
        makeJob({
          JobName: "LongJob",
          RepoName: "SOBR-01",
          RetainDays: 60,
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems.some((i) => i.includes("ShortJob"))).toBe(true);
    expect(rule?.affectedItems.some((i) => i.includes("LongJob"))).toBe(false);
  });
});
