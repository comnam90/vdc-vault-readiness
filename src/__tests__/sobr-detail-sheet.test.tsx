import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SobrDetailSheet } from "@/components/dashboard/sobr-detail-sheet";
import type {
  SafeSobr,
  SafeExtent,
  SafeCapExtent,
  SafeArchExtent,
} from "@/types/domain";

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

const MOCK_PERF_EXTENT: SafeExtent = {
  Name: "Perf-Extent-01",
  SobrName: "SOBR-01",
  Type: "Local",
  Host: "vbr-host-01",
  ImmutabilitySupported: true,
  FreeSpaceTB: 5.0,
  TotalSpaceTB: 10.0,
  FreeSpacePercent: 50,
};

const MOCK_CAP_EXTENT: SafeCapExtent = {
  Name: "Cap-Extent-01",
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
  GatewayServer: null,
  ConnectionType: null,
  ImmutabilityMode: null,
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
  GatewayServer: null,
  GatewayMode: null,
};

describe("SobrDetailSheet", () => {
  it("renders SOBR name in sheet title when open", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[]}
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
        perfExtents={[MOCK_PERF_EXTENT]}
        capExtents={[]}
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
        perfExtents={[]}
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
        perfExtents={[]}
        capExtents={[]}
        archExtents={[]}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByText("SOBR-01")).not.toBeInTheDocument();
  });

  it("shows immutable period in configuration section", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[]}
        capExtents={[]}
        archExtents={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("30 days")).toBeInTheDocument();
  });

  it("shows cap tier type in configuration section", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[]}
        capExtents={[]}
        archExtents={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Amazon S3")).toBeInTheDocument();
  });

  it("shows free space percent on performance tier extent", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[MOCK_PERF_EXTENT]}
        capExtents={[]}
        archExtents={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it("shows gateway server on cap extent when set", () => {
    const capExtentWithGateway = {
      ...MOCK_CAP_EXTENT,
      GatewayServer: "gw-server-01",
    };
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[]}
        capExtents={[capExtentWithGateway]}
        archExtents={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("gw-server-01")).toBeInTheDocument();
  });

  it("shows immutability badge on archive extent", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[]}
        capExtents={[]}
        archExtents={[MOCK_ARCH_EXTENT]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getAllByText("Disabled").length).toBeGreaterThan(0);
  });

  it("shows gateway mode on archive extent when set", () => {
    const archExtentWithGateway = {
      ...MOCK_ARCH_EXTENT,
      GatewayServer: "arch-gw-01",
      GatewayMode: "Direct",
    };
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        perfExtents={[]}
        capExtents={[]}
        archExtents={[archExtentWithGateway]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Direct")).toBeInTheDocument();
    expect(screen.getByText("arch-gw-01")).toBeInTheDocument();
  });
});
