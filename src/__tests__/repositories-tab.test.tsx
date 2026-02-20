import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepositoriesTab } from "@/components/dashboard/repositories-tab";
import type { SafeJob, SafeSobr } from "@/types/domain";

function makeManyJobs(count: number): SafeJob[] {
  return Array.from({ length: count }, (_, i) => ({
    JobName: `Job ${String(i + 1).padStart(3, "0")}`,
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: `Repo ${String(i + 1).padStart(3, "0")}`,
    SourceSizeGB: 100,
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

const MOCK_JOBS: SafeJob[] = [
  {
    JobName: "Job A",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    SourceSizeGB: 1024,
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
        jobs={MOCK_JOBS}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/standard repositories/i)).toBeInTheDocument();
  });

  it("renders repo names from jobs", () => {
    render(
      <RepositoriesTab
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
        jobs={[]}
        sobr={[]}
        extents={[]}
        capExtents={[]}
        archExtents={[]}
      />,
    );
    expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
  });
});

describe("Standard Repositories pagination", () => {
  it("paginates when more than 10 repos", () => {
    render(
      <RepositoriesTab
        jobs={makeManyJobs(25)}
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
        jobs={makeManyJobs(25)}
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
        jobs={makeManyJobs(10)}
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
