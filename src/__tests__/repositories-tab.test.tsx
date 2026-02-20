import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepositoriesTab } from "@/components/dashboard/repositories-tab";
import type {
  SafeJob,
  SafeSobr,
  SafeRepo,
  SafeCapExtent,
  SafeArchExtent,
} from "@/types/domain";

function makeManyRepos(count: number): SafeRepo[] {
  return Array.from({ length: count }, (_, i) => ({
    Name: `Repo ${String(i + 1).padStart(3, "0")}`,
    JobCount: 1,
    TotalSpaceTB: 1.0,
    FreeSpaceTB: 0.5,
    ImmutabilitySupported: false,
    Type: "LinuxLocal",
  }));
}

function makeManySOBRs(count: number): SafeSobr[] {
  return Array.from({ length: count }, (_, i) => ({
    Name: `SOBR-${String(i + 1).padStart(2, "0")}`,
    EnableCapacityTier: false,
    CapacityTierCopy: false,
    CapacityTierMove: false,
    ArchiveTierEnabled: false,
    ImmutableEnabled: false,
    ExtentCount: 1,
    JobCount: 1,
    PolicyType: null,
    UsePerVMFiles: null,
    CapTierType: null,
    ImmutablePeriod: null,
    SizeLimitEnabled: null,
    SizeLimit: null,
  }));
}

const MOCK_REPO: SafeRepo = {
  Name: "LinuxHardened",
  JobCount: 2,
  TotalSpaceTB: 2.5,
  FreeSpaceTB: 1.2,
  ImmutabilitySupported: true,
  Type: "LinuxLocal",
};

const MOCK_JOBS: SafeJob[] = [
  {
    JobName: "Job A",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    SourceSizeGB: 1024,
    RetainDays: null,
    GfsDetails: null,
    OnDiskGB: 512,
    RetentionScheme: null,
    CompressionLevel: null,
    BlockSize: null,
    GfsEnabled: null,
    ActiveFullEnabled: null,
    SyntheticFullEnabled: null,
    BackupChainType: null,
    IndexingEnabled: null,
  },
];

const MOCK_SOBR: SafeSobr = {
  Name: "SOBR-01",
  EnableCapacityTier: true,
  CapacityTierCopy: false,
  CapacityTierMove: true,
  ArchiveTierEnabled: false,
  ImmutableEnabled: true,
  ExtentCount: 1,
  JobCount: 3,
  PolicyType: null,
  UsePerVMFiles: null,
  CapTierType: null,
  ImmutablePeriod: 30,
  SizeLimitEnabled: null,
  SizeLimit: null,
};

describe("RepositoriesTab", () => {
  it("renders standard repos section heading", () => {
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={MOCK_JOBS}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/standard repositories/i)).toBeInTheDocument();
  });

  it("renders repo names from repos prop", () => {
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={MOCK_JOBS}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText("LinuxHardened")).toBeInTheDocument();
  });

  it("renders SOBR repos section heading", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[MOCK_SOBR]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/scale-out repositories/i)).toBeInTheDocument();
  });

  it("clicking SOBR row opens detail sheet", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[MOCK_SOBR]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    fireEvent.click(screen.getByText("SOBR-01"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows empty state when no standard repos", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
  });

  it("shows Immutability column header (not Encrypted)", () => {
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/immutability/i)).toBeInTheDocument();
    expect(screen.queryByText(/encrypted/i)).not.toBeInTheDocument();
  });

  it("shows immutability badge Yes for a supported repo", () => {
    render(
      <RepositoriesTab
        repos={[{ ...MOCK_REPO, ImmutabilitySupported: true }]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    // Should show "Yes" badge for immutability
    const badges = screen.getAllByText("Yes");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows Total Capacity and Free Capacity columns", () => {
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/total capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/free capacity/i)).toBeInTheDocument();
  });

  it("shows Source Data column derived from matching jobs", () => {
    // Job A: 1024 GB = 1 TB source data
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={MOCK_JOBS}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/source data/i)).toBeInTheDocument();
    // 1024 GB = 1.00 TB
    expect(screen.getByText("1.00 TB")).toBeInTheDocument();
  });

  it("shows Backup Data column derived from matching jobs", () => {
    // Job A: 512 GB OnDisk = 0.5 TB
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={MOCK_JOBS}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/backup data/i)).toBeInTheDocument();
    // 512 GB = 0.50 TB
    expect(screen.getByText("0.50 TB")).toBeInTheDocument();
  });

  it("shows red badge for immutability not supported", () => {
    render(
      <RepositoriesTab
        repos={[{ ...MOCK_REPO, ImmutabilitySupported: false }]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    const noBadge = screen.getByText("No");
    expect(noBadge).toHaveClass("text-destructive");
  });

  it("shows Name column header in standard repos table", () => {
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    // sobr={[]} so only standard repos section renders → one "Name" heading
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders standard repo name with truncate class", () => {
    render(
      <RepositoriesTab
        repos={[MOCK_REPO]}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    const nameSpan = screen.getByText("LinuxHardened");
    expect(nameSpan).toHaveClass("truncate");
  });

  it("renders SOBR name with truncate class", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[MOCK_SOBR]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    const nameSpan = screen.getByText("SOBR-01");
    expect(nameSpan).toHaveClass("truncate");
  });

  it("sorts standard repos descending when Name header clicked (default is asc)", () => {
    const repos = [
      { ...MOCK_REPO, Name: "Zoo Repo" },
      { ...MOCK_REPO, Name: "Alpha Repo" },
    ];
    render(
      <RepositoriesTab
        repos={repos}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    // Default sort asc → Alpha is first cell
    const cellsBefore = screen.getAllByRole("cell");
    expect(cellsBefore[0]).toHaveTextContent("Alpha Repo");

    // Click Name header → toggles to desc → Zoo is first
    fireEvent.click(screen.getByRole("button", { name: /^name$/i }));
    const cellsAfter = screen.getAllByRole("cell");
    expect(cellsAfter[0]).toHaveTextContent("Zoo Repo");
  });
});

describe("Standard Repositories pagination", () => {
  it("paginates when more than 10 repos", () => {
    render(
      <RepositoriesTab
        repos={makeManyRepos(25)}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText("Repo 001")).toBeInTheDocument();
    expect(screen.getByText("Repo 010")).toBeInTheDocument();
    expect(screen.queryByText("Repo 011")).not.toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it("navigates to next page in standard repos", () => {
    render(
      <RepositoriesTab
        repos={makeManyRepos(25)}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Repo 011")).toBeInTheDocument();
    expect(screen.queryByText("Repo 001")).not.toBeInTheDocument();
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
  });

  it("does not show pagination controls for 10 or fewer repos", () => {
    render(
      <RepositoriesTab
        repos={makeManyRepos(10)}
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /next/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Scale-Out Repositories pagination", () => {
  it("paginates when more than 10 SOBRs", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={makeManySOBRs(15)}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText("SOBR-01")).toBeInTheDocument();
    expect(screen.getByText("SOBR-10")).toBeInTheDocument();
    expect(screen.queryByText("SOBR-11")).not.toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it("navigates to next page in SOBR table", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={makeManySOBRs(15)}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("SOBR-11")).toBeInTheDocument();
    expect(screen.queryByText("SOBR-01")).not.toBeInTheDocument();
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });
});

describe("SOBR Source Data derivation", () => {
  it("shows Source Data and Backup Data column headers in SOBR table", () => {
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[MOCK_SOBR]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    // SOBR table should have Source Data and Backup Data columns
    const sourceDataHeaders = screen.getAllByText(/source data/i);
    expect(sourceDataHeaders.length).toBeGreaterThan(0);
    const backupDataHeaders = screen.getAllByText(/backup data/i);
    expect(backupDataHeaders.length).toBeGreaterThan(0);
  });

  it("shows capacity tier move period in SOBR table", () => {
    const mockCapExtent: SafeCapExtent = {
      Name: "Cap-01",
      SobrName: "SOBR-01",
      EncryptionEnabled: true,
      ImmutableEnabled: false,
      Type: "AmazonS3",
      Status: "Connected",
      CopyModeEnabled: false,
      MoveModeEnabled: true,
      MovePeriodDays: 90,
      ImmutablePeriod: null,
      SizeLimitEnabled: null,
      SizeLimit: null,
    };
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[
          { ...MOCK_SOBR, EnableCapacityTier: true, CapacityTierMove: true },
        ]}
        extents={[]}
        capExtents={[mockCapExtent]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText("90d")).toBeInTheDocument();
  });

  it("shows archive tier offload period in SOBR table", () => {
    const mockArchExtent: SafeArchExtent = {
      Name: "Arch-01",
      SobrName: "SOBR-01",
      ArchiveTierEnabled: true,
      EncryptionEnabled: true,
      ImmutableEnabled: false,
      OffloadPeriod: 60,
      CostOptimizedEnabled: null,
      FullBackupModeEnabled: null,
    };
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[]}
        sobr={[{ ...MOCK_SOBR, ArchiveTierEnabled: true }]}
        extents={[]}
        capExtents={[]}
        archExtents={[mockArchExtent]}
      />,
    );
    expect(screen.getByText("60d")).toBeInTheDocument();
  });

  it("shows SOBR Source Data derived from jobs targeting SOBR by name", () => {
    const jobTargetingSobr: SafeJob = {
      JobName: "SOBR Job",
      JobType: "VMware Backup",
      Encrypted: true,
      RepoName: "SOBR-01",
      SourceSizeGB: 2048,
      RetainDays: null,
      GfsDetails: null,
      OnDiskGB: null,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: null,
      ActiveFullEnabled: null,
      SyntheticFullEnabled: null,
      BackupChainType: null,
      IndexingEnabled: null,
    };
    render(
      <RepositoriesTab
        repos={[]}
        jobs={[jobTargetingSobr]}
        sobr={[MOCK_SOBR]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    // 2048 GB = 2.00 TB shown in SOBR table
    expect(screen.getByText("2.00 TB")).toBeInTheDocument();
  });
});
