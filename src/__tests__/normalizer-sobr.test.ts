import { describe, it, expect } from "vitest";
import { normalizeHealthcheck } from "@/lib/normalizer";
import type { NormalizerInput } from "@/types/healthcheck";

/** Minimal base input — no SOBR data, for use as spread base. */
const BASE_INPUT: NormalizerInput = {
  backupServer: [],
  securitySummary: [],
  jobInfo: [],
  Licenses: [],
};

describe("normalizeSobr", () => {
  it("normalizes a valid SOBR row with all required fields", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "True",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(1);
    expect(result.sobr[0]).toMatchObject({
      Name: "SOBR-01",
      EnableCapacityTier: true,
      CapacityTierCopy: true,
      CapacityTierMove: false,
      ArchiveTierEnabled: false,
      ImmutableEnabled: true,
    });
    expect(result.dataErrors).toHaveLength(0);
  });

  it("drops SOBR row missing Name and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: null,
          EnableCapacityTier: "True",
          CapacityTierCopy: "True",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "sobr",
      rowIndex: 0,
      field: "Name",
    });
  });

  it("drops SOBR row with invalid EnableCapacityTier and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "maybe",
          CapacityTierCopy: "True",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "sobr",
      field: "EnableCapacityTier",
    });
  });

  it("drops SOBR row with invalid CapacityTierCopy and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "invalid",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "sobr",
      field: "CapacityTierCopy",
    });
  });

  it("drops SOBR row with invalid CapacityTierMove and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "True",
          CapacityTierMove: "invalid",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "sobr",
      field: "CapacityTierMove",
    });
  });

  it("drops SOBR row with invalid ArchiveTierEnabled and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "True",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "invalid",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "sobr",
      field: "ArchiveTierEnabled",
    });
  });

  it("drops SOBR row with invalid ImmutableEnabled and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "True",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "maybe",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "sobr",
      field: "ImmutableEnabled",
    });
  });

  it("defaults optional fields to null when missing", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "False",
          CapacityTierMove: "True",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toHaveLength(1);
    expect(result.sobr[0].ExtentCount).toBeNull();
    expect(result.sobr[0].JobCount).toBeNull();
    expect(result.sobr[0].PolicyType).toBeNull();
    expect(result.sobr[0].UsePerVMFiles).toBeNull();
    expect(result.sobr[0].CapTierType).toBeNull();
    expect(result.sobr[0].ImmutablePeriod).toBeNull();
    expect(result.sobr[0].SizeLimitEnabled).toBeNull();
    expect(result.sobr[0].SizeLimit).toBeNull();
  });

  it("parses optional numeric and boolean fields", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      sobr: [
        {
          Name: "SOBR-01",
          EnableCapacityTier: "True",
          CapacityTierCopy: "True",
          CapacityTierMove: "False",
          ArchiveTierEnabled: "False",
          ImmutableEnabled: "True",
          ExtentCount: "3",
          JobCount: "10",
          PolicyType: "DataLocality",
          UsePerVMFiles: "True",
          CapTierType: "AzureBlob",
          ImmutablePeriod: "30",
          SizeLimitEnabled: "False",
          SizeLimit: "1024",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr[0].ExtentCount).toBe(3);
    expect(result.sobr[0].JobCount).toBe(10);
    expect(result.sobr[0].PolicyType).toBe("DataLocality");
    expect(result.sobr[0].UsePerVMFiles).toBe(true);
    expect(result.sobr[0].CapTierType).toBe("AzureBlob");
    expect(result.sobr[0].ImmutablePeriod).toBe(30);
    expect(result.sobr[0].SizeLimitEnabled).toBe(false);
    expect(result.sobr[0].SizeLimit).toBe(1024);
  });

  it("returns empty array when sobr input is undefined", () => {
    const raw: NormalizerInput = { ...BASE_INPUT };

    const result = normalizeHealthcheck(raw);

    expect(result.sobr).toEqual([]);
  });
});

describe("normalizeCapExtents", () => {
  it("normalizes a valid cap extent row", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: "True",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents).toHaveLength(1);
    expect(result.capExtents[0]).toMatchObject({
      Name: "AzureBlob-01",
      SobrName: "SOBR-01",
      EncryptionEnabled: true,
      ImmutableEnabled: true,
    });
    expect(result.dataErrors).toHaveLength(0);
  });

  it("drops cap extent row missing Name and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: null,
          SobrName: "SOBR-01",
          EncryptionEnabled: "True",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "capextents",
      field: "Name",
    });
  });

  it("drops cap extent row missing SobrName and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: null,
          EncryptionEnabled: "True",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "capextents",
      field: "SobrName",
    });
  });

  it("drops cap extent row with invalid EncryptionEnabled", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: "invalid",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "capextents",
      field: "EncryptionEnabled",
    });
  });

  it("drops cap extent row with invalid ImmutableEnabled", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: "True",
          ImmutableEnabled: "invalid",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "capextents",
      field: "ImmutableEnabled",
    });
  });

  it("parses optional numeric fields", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: "True",
          ImmutableEnabled: "True",
          MovePeriodDays: "14",
          ImmutablePeriod: "30",
          CopyModeEnabled: "True",
          MoveModeEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents[0].MovePeriodDays).toBe(14);
    expect(result.capExtents[0].ImmutablePeriod).toBe(30);
    expect(result.capExtents[0].CopyModeEnabled).toBe(true);
    expect(result.capExtents[0].MoveModeEnabled).toBe(false);
  });

  it("returns empty array when capextents input is undefined", () => {
    const raw: NormalizerInput = { ...BASE_INPUT };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents).toEqual([]);
  });

  it("parses GatewayServer, ConnectionType, ImmutabilityMode when present", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: "True",
          ImmutableEnabled: "True",
          GatewayServer: "gw-server-01",
          ConnectionType: "Gateway",
          ImmutabilityMode: "Governance",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents[0].GatewayServer).toBe("gw-server-01");
    expect(result.capExtents[0].ConnectionType).toBe("Gateway");
    expect(result.capExtents[0].ImmutabilityMode).toBe("Governance");
  });

  it("defaults GatewayServer, ConnectionType, ImmutabilityMode to null when absent", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      capextents: [
        {
          Name: "AzureBlob-01",
          SobrName: "SOBR-01",
          EncryptionEnabled: "True",
          ImmutableEnabled: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.capExtents[0].GatewayServer).toBeNull();
    expect(result.capExtents[0].ConnectionType).toBeNull();
    expect(result.capExtents[0].ImmutabilityMode).toBeNull();
  });
});

describe("normalizeArchExtents", () => {
  it("normalizes a valid archive extent row", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toHaveLength(1);
    expect(result.archExtents[0]).toMatchObject({
      SobrName: "SOBR-01",
      Name: "Archive-01",
      ArchiveTierEnabled: true,
      EncryptionEnabled: true,
      ImmutableEnabled: false,
    });
    expect(result.dataErrors).toHaveLength(0);
  });

  it("drops archive extent row missing SobrName and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: null,
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "archextents",
      field: "SobrName",
    });
  });

  it("drops archive extent row missing Name and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: null,
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "archextents",
      field: "Name",
    });
  });

  it("drops archive extent row with invalid ArchiveTierEnabled", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "invalid",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "archextents",
      field: "ArchiveTierEnabled",
    });
  });

  it("drops archive extent row with invalid EncryptionEnabled", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "invalid",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "archextents",
      field: "EncryptionEnabled",
    });
  });

  it("drops archive extent row with invalid ImmutableEnabled", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "invalid",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "archextents",
      field: "ImmutableEnabled",
    });
  });

  it("logs DataError when RetentionPeriod fallback value is non-numeric (old format)", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
          RetentionPeriod: "bad",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents[0].OffloadPeriod).toBeNull();
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "archextents",
      field: "OffloadPeriod",
    });
  });

  it("falls back to RetentionPeriod when OffloadPeriod is absent (old format)", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
          RetentionPeriod: "60",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents[0].OffloadPeriod).toBe(60);
    expect(result.dataErrors).toHaveLength(0);
  });

  it("prefers OffloadPeriod over RetentionPeriod when both are present", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
          OffloadPeriod: "90",
          RetentionPeriod: "60",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents[0].OffloadPeriod).toBe(90);
    expect(result.dataErrors).toHaveLength(0);
  });

  it("parses OffloadPeriod as numeric value", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
          OffloadPeriod: "90",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents[0].OffloadPeriod).toBe(90);
  });

  it("defaults optional fields to null when missing", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents[0].OffloadPeriod).toBeNull();
    expect(result.archExtents[0].CostOptimizedEnabled).toBeNull();
    expect(result.archExtents[0].FullBackupModeEnabled).toBeNull();
    expect(result.archExtents[0].GatewayServer).toBeNull();
    expect(result.archExtents[0].GatewayMode).toBeNull();
  });

  it("returns empty array when archextents input is undefined", () => {
    const raw: NormalizerInput = { ...BASE_INPUT };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents).toEqual([]);
  });

  it("parses GatewayServer and GatewayMode when present", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      archextents: [
        {
          SobrName: "SOBR-01",
          Name: "Archive-01",
          ArchiveTierEnabled: "True",
          EncryptionEnabled: "True",
          ImmutableEnabled: "False",
          GatewayServer: "arch-gw-01",
          GatewayMode: "Direct",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.archExtents[0].GatewayServer).toBe("arch-gw-01");
    expect(result.archExtents[0].GatewayMode).toBe("Direct");
  });
});

describe("normalizeExtents", () => {
  it("normalizes a valid extents row with all fields", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      extents: [
        {
          Name: "Perf-Extent-01",
          SobrName: "SOBR-01",
          Type: "Local",
          Host: "vbr-host-01",
          IsImmutabilitySupported: "True",
          FreeSpace: "5.0",
          TotalSpace: "10.0",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.extents).toHaveLength(1);
    expect(result.extents[0]).toMatchObject({
      Name: "Perf-Extent-01",
      SobrName: "SOBR-01",
      Type: "Local",
      Host: "vbr-host-01",
      ImmutabilitySupported: true,
      FreeSpaceTB: 5.0,
      TotalSpaceTB: 10.0,
    });
  });

  it("skips row missing required Name and records data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      extents: [{ SobrName: "SOBR-01", Type: "Local" }],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.extents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "extents",
      field: "Name",
    });
  });

  it("skips row missing required SobrName and records data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      extents: [{ Name: "Perf-01", Type: "Local" }],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.extents).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "extents",
      field: "SobrName",
    });
  });

  it("returns empty array when extents input is undefined", () => {
    const raw: NormalizerInput = { ...BASE_INPUT };

    const result = normalizeHealthcheck(raw);

    expect(result.extents).toEqual([]);
  });

  it("parses FreeSpacePercent when present", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      extents: [
        {
          Name: "Perf-Extent-01",
          SobrName: "SOBR-01",
          FreeSpacePercent: "42",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.extents[0].FreeSpacePercent).toBe(42);
  });

  it("defaults FreeSpacePercent to null when absent", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      extents: [
        {
          Name: "Perf-Extent-01",
          SobrName: "SOBR-01",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.extents[0].FreeSpacePercent).toBeNull();
  });
});

describe("normalizeRepos", () => {
  it("normalizes a valid repo row with all fields", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      repos: [
        {
          Name: "LinuxHardened",
          IsImmutabilitySupported: "True",
          JobCount: "5",
          TotalSpace: "10.0",
          FreeSpace: "4.5",
          Type: "LinuxLocal",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]).toMatchObject({
      Name: "LinuxHardened",
      ImmutabilitySupported: true,
      JobCount: 5,
      TotalSpaceTB: 10.0,
      FreeSpaceTB: 4.5,
      Type: "LinuxLocal",
    });
    expect(result.dataErrors).toHaveLength(0);
  });

  it("drops repo row missing Name and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      repos: [
        {
          Name: null,
          IsImmutabilitySupported: "True",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.repos).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "repos",
      rowIndex: 0,
      field: "Name",
    });
  });

  it("drops repo row with invalid IsImmutabilitySupported and logs data error", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      repos: [
        {
          Name: "WindowsRepo",
          IsImmutabilitySupported: "maybe",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.repos).toHaveLength(0);
    expect(result.dataErrors).toHaveLength(1);
    expect(result.dataErrors[0]).toMatchObject({
      section: "repos",
      field: "IsImmutabilitySupported",
    });
  });

  it("returns empty array when repos input is undefined", () => {
    const raw: NormalizerInput = { ...BASE_INPUT };

    const result = normalizeHealthcheck(raw);

    expect(result.repos).toEqual([]);
  });

  it("defaults optional fields to null when missing", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      repos: [
        {
          Name: "MinimalRepo",
          IsImmutabilitySupported: "False",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].JobCount).toBeNull();
    expect(result.repos[0].TotalSpaceTB).toBeNull();
    expect(result.repos[0].FreeSpaceTB).toBeNull();
    expect(result.repos[0].Type).toBeNull();
  });

  it("parses optional numeric fields from string values", () => {
    const raw: NormalizerInput = {
      ...BASE_INPUT,
      repos: [
        {
          Name: "FullRepo",
          IsImmutabilitySupported: "True",
          JobCount: "12",
          TotalSpace: "5.5",
          FreeSpace: "2.0",
        },
      ],
    };

    const result = normalizeHealthcheck(raw);

    expect(result.repos[0].JobCount).toBe(12);
    expect(result.repos[0].TotalSpaceTB).toBe(5.5);
    expect(result.repos[0].FreeSpaceTB).toBe(2.0);
  });
});
