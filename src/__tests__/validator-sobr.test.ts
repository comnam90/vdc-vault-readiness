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
    extents: [],
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
  it("warns for unencrypted job on SOBR with capacity tier (SOBR-layer assumption)", () => {
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

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toContain("Job A");
    expect(rule?.message).toContain("SOBR");
    expect(rule?.message).toContain("capacity tier");
  });

  it("all unencrypted on cap-tier SOBRs: warns with SOBR-layer message", () => {
    const data = makeDataset({
      jobInfo: [
        makeJob({ JobName: "Job A", Encrypted: false, RepoName: "SOBR-01" }),
        makeJob({ JobName: "Job B", Encrypted: false, RepoName: "SOBR-01" }),
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

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toEqual(["Job A", "Job B"]);
    expect(rule?.message).toContain("SOBR");
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
          OffloadPeriod: null,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
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
          OffloadPeriod: 90,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
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

  it("archive active but job has no GFS: no archive warning", () => {
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
          OffloadPeriod: 20,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
        },
      ],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 60 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // No GFS on the job, so archive tier doesn't apply
    expect(rule?.affectedItems.every((i) => !i.includes("archived"))).toBe(
      true,
    );
  });

  it("archive caps GFS residency below 30 days: warns with archived message", () => {
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
          OffloadPeriod: 20,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
        },
      ],
      jobInfo: [
        makeJob({
          JobName: "GfsJob",
          RepoName: "SOBR-01",
          RetainDays: 60,
          GfsEnabled: true,
          GfsDetails: "Yearly:1",
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // archiveOlderThan=20, immutablePeriod=0, effectiveArchTrigger=20
    // GFS yearly=365 days, capped by archive to 20 days residency
    expect(rule?.status).toBe("warning");
    expect(
      rule?.affectedItems.some(
        (i) => i.includes("GfsJob") && i.includes("archived"),
      ),
    ).toBe(true);
  });

  it("archive threshold > GFS period: GFS retention check wins (not capped by archive)", () => {
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
          OffloadPeriod: 60,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
        },
      ],
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

    // GFS weekly: 3*7=21 days, arrivalDay=14, retentionResidency=7 < 30
    // archiveOlderThan=60 > 21 days, so archive doesn't cap this
    expect(rule?.status).toBe("warning");
    expect(
      rule?.affectedItems.some(
        (i) => i.includes("GfsJob") && i.includes("weekly"),
      ),
    ).toBe(true);
    // Should NOT mention "archived" since archive doesn't cap this
    expect(
      rule?.affectedItems.some(
        (i) => i.includes("GfsJob") && i.includes("archived"),
      ),
    ).toBe(false);
  });

  it("archive threshold <= arrivalDay: skip (no negative values)", () => {
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
          OffloadPeriod: 10,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
        },
      ],
      jobInfo: [
        makeJob({
          JobName: "GfsJob",
          RepoName: "SOBR-01",
          RetainDays: 60,
          GfsEnabled: true,
          GfsDetails: "Yearly:1",
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // archiveOlderThan=10 (capped by immutable=0 → effectiveArchTrigger=14 via max(10,0)=10)
    // effectiveArchTrigger=10 <= arrivalDay=14, so archive is moot, GFS yearly=365 is fine
    expect(rule?.affectedItems.every((i) => !i.includes("archived"))).toBe(
      true,
    );
  });

  it("immutability delays archive past 30 days: GFS passes", () => {
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
          OffloadPeriod: 20,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
        },
      ],
      jobInfo: [
        makeJob({
          JobName: "GfsJob",
          RepoName: "SOBR-01",
          RetainDays: 90,
          GfsEnabled: true,
          GfsDetails: "Yearly:1",
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // archiveOlderThan=20, immutablePeriod=60, effectiveArchTrigger=max(20,60)=60
    // GFS yearly=365, capped by archive to 60 days residency >= 30: pass
    expect(rule?.affectedItems.every((i) => !i.includes("archived"))).toBe(
      true,
    );
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

  it("null OffloadPeriod on archive: no archive impact on GFS", () => {
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
          OffloadPeriod: null,
          CostOptimizedEnabled: null,
          FullBackupModeEnabled: null,
        },
      ],
      jobInfo: [
        makeJob({
          JobName: "GfsJob",
          RepoName: "SOBR-01",
          RetainDays: 60,
          GfsEnabled: true,
          GfsDetails: "Yearly:1",
        }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    // No archive impact because OffloadPeriod is null → archiveOlderThan=null
    expect(rule?.affectedItems.every((i) => !i.includes("archived"))).toBe(
      true,
    );
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

describe("missing cap/arch extent data (old healthcheck version)", () => {
  /** SOBR with cap tier and archive enabled but no extent data. */
  function makeSobrWithTiers(overrides: Record<string, unknown> = {}) {
    return {
      Name: "SOBR-01",
      EnableCapacityTier: true,
      CapacityTierCopy: true,
      CapacityTierMove: true,
      ArchiveTierEnabled: true,
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

  it("sobr-cap-encryption: warns when SOBR has cap tier but no cap extent data", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers()],
      capExtents: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-cap-encryption");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toContain("SOBR-01");
    expect(rule?.message).toContain("missing");
  });

  it("sobr-cap-encryption: passes when no SOBRs have cap tier (even with empty extents)", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers({ EnableCapacityTier: false })],
      capExtents: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-cap-encryption");

    expect(rule?.status).toBe("pass");
  });

  it("sobr-immutability: warns when SOBR has cap tier but no cap extent data", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers()],
      capExtents: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-immutability");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toContain("SOBR-01");
    expect(rule?.message).toContain("missing");
  });

  it("sobr-immutability: passes when no SOBRs have cap tier (even with empty extents)", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers({ EnableCapacityTier: false })],
      capExtents: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "sobr-immutability");

    expect(rule?.status).toBe("pass");
  });

  it("archive-tier-edition: warns when SOBR has archive tier but no arch extent data", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers()],
      archExtents: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "archive-tier-edition");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toContain("SOBR-01");
    expect(rule?.message).toContain("missing");
  });

  it("archive-tier-edition: passes when no SOBRs have archive tier (even with empty extents)", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers({ ArchiveTierEnabled: false })],
      archExtents: [],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "archive-tier-edition");

    expect(rule?.status).toBe("pass");
  });

  it("capacity-tier-residency: warns when SOBR has cap tier but no cap extent data", () => {
    const data = makeDataset({
      sobr: [makeSobrWithTiers()],
      capExtents: [],
      jobInfo: [makeJob({ RepoName: "SOBR-01", RetainDays: 60 })],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems.some((i) => i.includes("SOBR-01"))).toBe(true);
    expect(rule?.affectedItems.some((i) => i.includes("missing"))).toBe(true);
  });

  it("capacity-tier-residency: only flags SOBRs missing extent data, not those with it", () => {
    const data = makeDataset({
      sobr: [
        makeSobrWithTiers({ Name: "SOBR-Missing" }),
        makeSobrWithTiers({ Name: "SOBR-OK" }),
      ],
      capExtents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-OK",
          EncryptionEnabled: true,
          ImmutableEnabled: true,
          Type: null,
          Status: null,
          CopyModeEnabled: true,
          MoveModeEnabled: false,
          MovePeriodDays: null,
          ImmutablePeriod: 30,
          SizeLimitEnabled: null,
          SizeLimit: null,
        },
      ],
      jobInfo: [
        makeJob({ RepoName: "SOBR-Missing", RetainDays: 60 }),
        makeJob({ JobName: "OKJob", RepoName: "SOBR-OK", RetainDays: 60 }),
      ],
    });

    const results = validateHealthcheck(data);
    const rule = findRule(results, "capacity-tier-residency");

    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems.some((i) => i.includes("SOBR-Missing"))).toBe(
      true,
    );
    expect(rule?.affectedItems.some((i) => i.includes("SOBR-OK"))).toBe(false);
  });
});
