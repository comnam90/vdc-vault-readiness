import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SobrDetailSheet } from "@/components/dashboard/sobr-detail-sheet";
import type { SafeSobr, SafeCapExtent, SafeArchExtent } from "@/types/domain";

const MOCK_SOBR: SafeSobr = {
  Name: "SOBR-01",
  EnableCapacityTier: true,
  CapacityTierCopy: false,
  CapacityTierMove: true,
  ArchiveTierEnabled: true,
  ImmutableEnabled: true,
  ExtentCount: 2,
  JobCount: 5,
  PolicyType: "GFS",
  UsePerVMFiles: true,
  CapTierType: "Amazon S3",
  ImmutablePeriod: 30,
  SizeLimitEnabled: false,
  SizeLimit: null,
};

const MOCK_CAP_EXTENT: SafeCapExtent = {
  Name: "Perf-Extent-01",
  SobrName: "SOBR-01",
  EncryptionEnabled: true,
  ImmutableEnabled: true,
  Type: "Hardened Repository",
  Status: "Online",
  CopyModeEnabled: false,
  MoveModeEnabled: false,
  MovePeriodDays: null,
  ImmutablePeriod: 30,
  SizeLimitEnabled: false,
  SizeLimit: null,
};

const MOCK_ARCH_EXTENT: SafeArchExtent = {
  SobrName: "SOBR-01",
  Name: "Archive-Extent-01",
  ArchiveTierEnabled: true,
  EncryptionEnabled: true,
  ImmutableEnabled: false,
  OffloadPeriod: 365,
  CostOptimizedEnabled: true,
  FullBackupModeEnabled: false,
};

describe("SobrDetailSheet", () => {
  it("renders SOBR name in sheet title when open", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        capExtents={[MOCK_CAP_EXTENT]}
        archExtents={[MOCK_ARCH_EXTENT]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("SOBR-01")).toBeInTheDocument();
  });

  it("shows performance tier section with extent details", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        capExtents={[MOCK_CAP_EXTENT]}
        archExtents={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText(/performance tier/i)).toBeInTheDocument();
    expect(screen.getByText("Perf-Extent-01")).toBeInTheDocument();
  });

  it("shows archive tier section when archExtents provided", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        capExtents={[]}
        archExtents={[MOCK_ARCH_EXTENT]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getAllByText(/archive tier/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Archive-Extent-01")).toBeInTheDocument();
  });

  it("renders nothing when sobr is null", () => {
    render(
      <SobrDetailSheet
        sobr={null}
        capExtents={[]}
        archExtents={[]}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByText("SOBR-01")).not.toBeInTheDocument();
  });
});
