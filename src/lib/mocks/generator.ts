import type { HealthcheckRoot } from "../../types/healthcheck";

/**
 * Accuracy-first Mock Generator for Veeam Healthcheck JSON
 *
 * This generator ensures:
 * 1. Referential integrity (Jobs -> Repos -> SOBRs)
 * 2. Proper Header/Row alignment
 * 3. Detailed field population for UI testing (Job Details, Sizing, Repos)
 */

export class HealthcheckMockBuilder {
  private data: HealthcheckRoot;

  constructor() {
    this.data = {
      Licenses: [],
      Sections: {},
    };
  }

  private static rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Generates a "Standard Passing" environment for VDC Vault
   */
  static createPassingV12(): HealthcheckRoot {
    const builder = new HealthcheckMockBuilder()
      .withLicense("EnterprisePlus", "Valid")
      .withBackupServer("VBR-PROD-01", "12.1.2.172")
      .withSecuritySummary(true, true, true, true, true)
      .withSobr("SOBR_Primary", true, true, 7)
      .withRepo("Linux-Hardened-01", "LinuxHardened", true)
      .withRepo("Dedupe-Appliance-01", "DDBoost", false);

    // Add jobs to SOBR
    for (let i = 1; i <= 8; i++) {
      builder.addDetailedJob(
        `Job_VM_Critical_${i}`,
        "SOBR_Primary",
        true,
        31,
        "Backup",
      );
    }

    // Add jobs to Repos
    builder.addDetailedJob(
      "Job_Physical_Srv_01",
      "Linux-Hardened-01",
      true,
      30,
      "Agent Backup",
    );
    builder.addDetailedJob(
      "Job_File_Share_01",
      "Dedupe-Appliance-01",
      true,
      14,
      "File Backup",
    );

    return builder.build();
  }

  static createLegacyV11(): HealthcheckRoot {
    return new HealthcheckMockBuilder()
      .withLicense("EnterprisePlus", "Valid")
      .withBackupServer("Server_Old", "11.0.1.1261")
      .withSecuritySummary(false, false, false, false, false)
      .withRepo("Windows-Repo-Old", "WinLocal", false)
      .addDetailedJob("Job_Legacy_01", "Windows-Repo-Old", false, 14)
      .build();
  }

  static createBlockingAWS(): HealthcheckRoot {
    return new HealthcheckMockBuilder()
      .withLicense("EnterprisePlus", "Valid")
      .withBackupServer("VBR-PROD-01", "12.2.0.334")
      .withSecuritySummary(true, true, true, true, true)
      .withSobr("SOBR_Vault", true, true, 7)
      .addDetailedJob("Job_VM_01", "SOBR_Vault", true, 31)
      .addDetailedJob(
        "Job_AWS_Direct",
        "SOBR_Vault",
        true,
        30,
        "Veeam.Vault.AWS.Backup",
      )
      .build();
  }

  static createWarningUnencrypted(): HealthcheckRoot {
    return new HealthcheckMockBuilder()
      .withLicense("EnterprisePlus", "Valid")
      .withBackupServer("VBR-SEC-01", "12.1.2.172")
      .withSecuritySummary(true, true, true, true, true)
      .withRepo("Linux-Repo-01", "LinuxLocal", false)
      .addDetailedJob("Job_Unencrypted_01", "Linux-Repo-01", false, 31)
      .build();
  }

  static createCommunityEdition(): HealthcheckRoot {
    return new HealthcheckMockBuilder()
      .withLicense("Community Edition", "Valid")
      .withBackupServer("LAB-VBR", "12.1.2.172")
      .withSecuritySummary(true, true, true, true, true)
      .withRepo("Local-Disk", "WinLocal", false)
      .addDetailedJob("Lab_Job_01", "Local-Disk", true, 31)
      .build();
  }

  static createLowRetention(): HealthcheckRoot {
    return new HealthcheckMockBuilder()
      .withLicense("EnterprisePlus", "Valid")
      .withBackupServer("VBR-PROD-01", "12.1.2.172")
      .withSecuritySummary(true, true, true, true, true)
      .withSobr("SOBR_Vault", true, true, 7)
      .addDetailedJob("Short_Ret_Job_01", "SOBR_Vault", true, 7)
      .build();
  }

  /**
   * Generates a high-end enterprise environment with SOBR Archive Tier
   */
  static createAdvancedCloud(): HealthcheckRoot {
    const builder = new HealthcheckMockBuilder()
      .withLicense("EnterprisePlus", "Valid")
      .withBackupServer("VBR-CLOUD-01", "12.1.2.172")
      .withSecuritySummary(true, true, true, true, true)
      .withSobr("SOBR_Archive", true, true, 7);

    // Add Archive Tier to this SOBR
    builder.addArchiveExtent("Archive-Tier-01", "SOBR_Archive", 90);

    for (let i = 1; i <= 5; i++) {
      builder.addDetailedJob(
        `Job_GFS_Cloud_${i}`,
        "SOBR_Archive",
        true,
        31,
        "Backup",
      );
    }

    return builder.build();
  }

  withLicense(edition: string, status: string = "Valid"): this {
    this.data.Licenses = [
      {
        Edition: edition,
        Status: status,
        LicensedTo: "Synthetic Testing Corp",
        Type: "Subscription",
        LicensedInstances: "500",
        UsedInstances: "245",
        NewInstances: "0",
        RentalInstances: "0",
        LicensedSockets: "0",
        UsedSockets: "0",
        LicensedNas: "0",
        UsedNas: "0",
        ExpirationDate: "12/31/2028 12:00:00 AM",
        SupportExpirationDate: "12/31/2028 12:00:00 AM",
        CloudConnect: "Disabled",
      },
    ];
    return this;
  }

  withBackupServer(name: string, version: string): this {
    this.data.Sections.backupServer = {
      SectionName: "backupServer",
      Headers: [
        "Name",
        "Version",
        "DbType",
        "DbHost",
        "ConfigBackupEnabled",
        "ConfigBackupLastResult",
        "ConfigBackupEncryption",
        "ConfigBackupTarget",
      ],
      Rows: [
        [
          name,
          version,
          "PostgreSQL",
          "localhost",
          "True",
          "Success",
          "True",
          "Default Configuration Backup",
        ],
      ],
    };
    return this;
  }

  withSecuritySummary(
    mfa: boolean,
    fileEnc: boolean,
    configEnc: boolean,
    trafficEnc: boolean,
    immutability: boolean,
  ): this {
    this.data.Sections.securitySummary = {
      SectionName: "securitySummary",
      Headers: [
        "MFAEnabled",
        "TrafficEncryptionEnabled",
        "BackupFileEncryptionEnabled",
        "ConfigBackupEncryptionEnabled",
        "ImmutabilityEnabled",
      ],
      Rows: [
        [
          mfa ? "True" : "False",
          trafficEnc ? "True" : "False",
          fileEnc ? "True" : "False",
          configEnc ? "True" : "False",
          immutability ? "True" : "False",
        ],
      ],
    };
    return this;
  }

  withSobr(
    name: string,
    hasCapTier: boolean,
    immutable: boolean,
    immutableDays: number,
  ): this {
    if (!this.data.Sections.sobr) {
      this.data.Sections.sobr = {
        SectionName: "sobr",
        Headers: [
          "Name",
          "ExtentCount",
          "JobCount",
          "PolicyType",
          "EnableCapacityTier",
          "CapacityTierCopy",
          "CapacityTierMove",
          "ArchiveTierEnabled",
          "UsePerVMFiles",
          "CapTierType",
          "ImmutableEnabled",
          "ImmutablePeriod",
          "SizeLimitEnabled",
          "SizeLimit",
        ],
        Rows: [],
      };
    }

    this.data.Sections.sobr.Rows.push([
      name,
      "2",
      "0", // Will be updated by addDetailedJob if needed, but the normalizer re-calculates
      "DataLocality",
      hasCapTier ? "True" : "False",
      hasCapTier ? "True" : "False",
      hasCapTier ? "True" : "False",
      "False",
      "True",
      hasCapTier ? "DataCloudVault" : null,
      immutable ? "True" : "False",
      immutable ? immutableDays.toString() : null,
      "False",
      null,
    ]);

    // Add Performance Extents
    this.addExtent(name + "_Perf_01", name, "LinuxLocal", "Server-01", true);
    this.addExtent(name + "_Perf_02", name, "LinuxLocal", "Server-02", true);

    if (hasCapTier) {
      this.addCapExtent(
        name + "_Cap_Tier",
        name,
        true,
        immutable,
        immutableDays,
      );
    }

    return this;
  }

  private addExtent(
    name: string,
    sobrName: string,
    type: string,
    host: string,
    immutable: boolean,
  ) {
    if (!this.data.Sections.extents) {
      this.data.Sections.extents = {
        SectionName: "extents",
        Headers: [
          "Name",
          "SobrName",
          "MaxTasks",
          "Cores",
          "Ram",
          "Host",
          "Path",
          "FreeSpace",
          "TotalSpace",
          "IsImmutabilitySupported",
          "Type",
        ],
        Rows: [],
      };
    }
    const total = HealthcheckMockBuilder.rand(50, 200);
    const free = HealthcheckMockBuilder.rand(10, total);

    this.data.Sections.extents.Rows.push([
      name,
      sobrName,
      "8",
      "16",
      "64",
      host,
      "/mnt/backup",
      free.toString(),
      total.toString(),
      immutable ? "True" : "False",
      type,
    ]);
  }

  private addCapExtent(
    name: string,
    sobrName: string,
    encrypted: boolean,
    immutable: boolean,
    days: number,
  ) {
    if (!this.data.Sections.capextents) {
      this.data.Sections.capextents = {
        SectionName: "capextents",
        Headers: [
          "Name",
          "SobrName",
          "Status",
          "ConnectionType",
          "GatewayServer",
          "CopyModeEnabled",
          "MoveModeEnabled",
          "MovePeriodDays",
          "EncryptionEnabled",
          "ImmutableEnabled",
          "ImmutablePeriod",
          "ImmutabilityMode",
          "SizeLimitEnabled",
          "SizeLimit",
          "Type",
        ],
        Rows: [],
      };
    }
    this.data.Sections.capextents.Rows.push([
      name,
      sobrName,
      "Normal",
      "Direct",
      "VBR-PROD-01",
      "True",
      "True",
      "0",
      encrypted ? "True" : "False",
      immutable ? "True" : "False",
      immutable ? days.toString() : null,
      "Compliance",
      "False",
      null,
      "DataCloudVault",
    ]);
  }

  addArchiveExtent(name: string, sobrName: string, offloadPeriod: number) {
    if (!this.data.Sections.archextents) {
      this.data.Sections.archextents = {
        SectionName: "archextents",
        Headers: [
          "Name",
          "SobrName",
          "Status",
          "GatewayMode",
          "GatewayServer",
          "OffloadPeriod",
          "ArchiveTierEnabled",
          "CostOptimizedEnabled",
          "FullBackupModeEnabled",
          "EncryptionEnabled",
          "ImmutableEnabled",
          "Type",
        ],
        Rows: [],
      };
    }
    this.data.Sections.archextents.Rows.push([
      name,
      sobrName,
      "Normal",
      "Direct",
      "VBR-PROD-01",
      offloadPeriod.toString(),
      "True",
      "True",
      "False",
      "True",
      "False",
      "AzureArchive",
    ]);
  }

  withRepo(name: string, type: string, immutable: boolean): this {
    if (!this.data.Sections.repos) {
      this.data.Sections.repos = {
        SectionName: "repos",
        Headers: [
          "Name",
          "JobCount",
          "MaxTasks",
          "Cores",
          "Ram",
          "Host",
          "Path",
          "FreeSpace",
          "TotalSpace",
          "IsImmutabilitySupported",
          "Type",
        ],
        Rows: [],
      };
    }
    const total = HealthcheckMockBuilder.rand(10, 50);
    const free = HealthcheckMockBuilder.rand(1, total);

    this.data.Sections.repos.Rows.push([
      name,
      "0",
      "4",
      "8",
      "32",
      "Backup-Repo-01",
      "/backups",
      free.toString(),
      total.toString(),
      immutable ? "True" : "False",
      type,
    ]);
    return this;
  }

  addDetailedJob(
    name: string,
    repoName: string,
    encrypted: boolean,
    retentionDays: number,
    type: string = "Backup",
  ): this {
    if (!this.data.Sections.jobInfo) {
      this.data.Sections.jobInfo = {
        SectionName: "jobInfo",
        Headers: [
          "JobName",
          "RepoName",
          "SourceSizeGB",
          "OnDiskGB",
          "RetentionScheme",
          "RetainDays",
          "Encrypted",
          "JobType",
          "CompressionLevel",
          "BlockSize",
          "GfsEnabled",
          "GfsDetails",
          "ActiveFullEnabled",
          "SyntheticFullEnabled",
          "BackupChainType",
          "IndexingEnabled",
        ],
        Rows: [],
      };
    }

    const sourceSize = HealthcheckMockBuilder.rand(500, 5000);
    const onDisk = Math.floor(sourceSize * 0.6);

    this.data.Sections.jobInfo.Rows.push([
      name,
      repoName,
      sourceSize.toString(),
      onDisk.toString(),
      "Days",
      retentionDays.toString(),
      encrypted ? "True" : "False",
      type,
      "Optimal",
      "1 MB",
      "False",
      "",
      "False",
      "True",
      "Forward Incremental",
      "True",
    ]);

    // Add session history for this job
    this.addJobSession(name);

    return this;
  }

  private addJobSession(jobName: string) {
    if (!this.data.Sections.jobSessionSummaryByJob) {
      this.data.Sections.jobSessionSummaryByJob = {
        SectionName: "jobSessionSummaryByJob",
        Headers: [
          "JobName",
          "ItemCount",
          "MinJobTime",
          "MaxJobTime",
          "AvgJobTime",
          "SessionCount",
          "Fails",
          "Retries",
          "SuccessRate",
          "AvgBackupSize",
          "MaxBackupSize",
          "AvgDataSize",
          "MaxDataSize",
          "AvgChangeRate",
          "WaitCount",
          "MaxWait",
          "AvgWait",
          "JobTypes",
        ],
        Rows: [],
      };
    }

    const avgDataSize = HealthcheckMockBuilder.rand(100, 500);

    this.data.Sections.jobSessionSummaryByJob.Rows.push([
      jobName,
      "10",
      "00:05:00",
      "02:30:00",
      "01:15:00",
      "30",
      "0",
      "1",
      "100",
      (avgDataSize * 0.5).toString(),
      (avgDataSize * 0.8).toString(),
      avgDataSize.toString(),
      (avgDataSize * 1.2).toString(),
      "2.5",
      "0",
      "0",
      "0",
      "VMware Backup",
    ]);
  }

  build(): HealthcheckRoot {
    return this.data;
  }
}
