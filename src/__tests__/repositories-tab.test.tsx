import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepositoriesTab } from "@/components/dashboard/repositories-tab";
import type { SafeJob, SafeSobr } from "@/types/domain";

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
        capExtents={[]}
        archExtents={[]}
      />,
    );
    fireEvent.click(screen.getByText("SOBR-01"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows empty state when no standard repos", () => {
    render(
      <RepositoriesTab jobs={[]} sobr={[]} capExtents={[]} archExtents={[]} />,
    );
    expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
  });
});
