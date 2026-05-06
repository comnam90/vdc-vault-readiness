import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SizingResults } from "@/components/dashboard/sizing-results";
import type {
  RestorePoint,
  VmAgentResponse,
  VmAgentResponseData,
} from "@/types/veeam-api";

function rp(overrides: Partial<RestorePoint> = {}): RestorePoint {
  return {
    pointType: "performanceTier",
    day: 1,
    backupCapacity: 0,
    isFull: false,
    isGFS: false,
    isImmutable: false,
    flags: "D1",
    ...overrides,
  };
}

const RESTORE_POINTS: RestorePoint[] = [
  rp({ day: 1, backupCapacity: 0.25, flags: "D1" }),
  rp({ day: 7, backupCapacity: 0.5, flags: "W1" }),
  rp({ day: 30, backupCapacity: 1.0, flags: "M1" }),
  rp({ day: 365, backupCapacity: 5.25, flags: "Y1" }),
];

const MOCK_DATA: VmAgentResponseData = {
  totalStorageTB: 12.5,
  proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
  repoCompute: {
    compute: {
      cores: 8,
      ram: 16,
      volumes: [{ diskGB: 13500, diskPurpose: 3 }],
    },
  },
  transactions: {
    capacityTierTransactions: {
      firstMonthTransactions: 1000,
      secondMonthTransactions: 800,
      finalMonthTransactions: 600,
    },
  },
  performanceTierImmutabilityTaxGB: 250,
  capacityTierImmutabilityTaxGB: 0,
  restorePoints: RESTORE_POINTS,
};

const MOCK_RESULT: VmAgentResponse = {
  success: true,
  data: MOCK_DATA,
};

const MOCK_UPGRADE_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 10.0,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 200,
    capacityTierImmutabilityTaxGB: 0,
    restorePoints: RESTORE_POINTS,
  },
};

function buildResult(
  overrides: Partial<VmAgentResponseData> = {},
): VmAgentResponse {
  return {
    success: true,
    data: { ...MOCK_DATA, ...overrides },
  };
}

describe("SizingResults", () => {
  it("displays the total storage prominently as the hero metric", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText("12.50 TB")).toBeInTheDocument();
  });

  it("does not render proxy/repo compute (Storage-as-a-Service)", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.queryByText(/cores/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GB RAM/i)).not.toBeInTheDocument();
  });

  it("renders the performance-tier immutability inline within the hero legend", () => {
    render(
      <SizingResults
        result={buildResult({
          performanceTierImmutabilityTaxGB: 678.6973615114821,
        })}
      />,
    );
    expect(
      screen.getAllByText(/Immutability Overhead/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/678\.7\s*GB/)).toBeInTheDocument();
    expect(screen.queryByText(/678\.6973/)).not.toBeInTheDocument();
    // The standalone Immutability Tax card is removed.
    expect(screen.queryByText(/Immutability Tax/i)).not.toBeInTheDocument();
  });

  it("decorates the hero card with the top accent border", () => {
    const { container } = render(<SizingResults result={MOCK_RESULT} />);
    expect(
      container.querySelector(".border-t-4.border-t-primary"),
    ).not.toBeNull();
  });

  it("renders the proportion bar with five data segments incl. immutability", () => {
    const { container } = render(<SizingResults result={MOCK_RESULT} />);
    const segments = container.querySelectorAll("[data-segment]");
    expect(segments.length).toBe(5);
    const tiers = Array.from(segments).map((s) =>
      s.getAttribute("data-segment"),
    );
    expect(tiers).toEqual([
      "yearly",
      "monthly",
      "weekly",
      "daily",
      "immutability",
    ]);
  });

  it("exposes a group aria-label naming each bucket and percentage", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    const group = screen.getByRole("group", {
      name: /retention composition/i,
    });
    const label = group.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Yearly/);
    expect(label).toMatch(/Monthly/);
    expect(label).toMatch(/Weekly/);
    expect(label).toMatch(/Daily/);
    expect(label).toMatch(/Immutability/);
  });

  describe("empty restorePoints", () => {
    it("shows the unavailable caption and dashes for both baselines", () => {
      const { container } = render(
        <SizingResults
          result={buildResult({
            restorePoints: [],
            performanceTierImmutabilityTaxGB: 0,
          })}
        />,
      );
      expect(
        screen.getByText(/restore-point breakdown unavailable/i),
      ).toBeInTheDocument();

      const baselinesCard = container
        .querySelector('[data-slot="card-title"]')
        ?.closest('[data-slot="card"]');
      expect(baselinesCard).not.toBeNull();
      const within_ = within(baselinesCard as HTMLElement);
      expect(within_.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("inline upgrade annotations", () => {
    it("shows no upgrade annotation when upgradeResult is absent", () => {
      render(<SizingResults result={MOCK_RESULT} />);
      expect(screen.queryByText(/VBR 13/i)).not.toBeInTheDocument();
    });

    it("shows the hero storage caption when an upgrade saves storage", () => {
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={MOCK_UPGRADE_RESULT}
        />,
      );
      expect(
        screen.getByText(/upgrade to VBR 13 could reduce this to/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/10\.00 TB/)).toBeInTheDocument();
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });

    it("shows the immutability annotation when an upgrade saves perf-tier tax", () => {
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={MOCK_UPGRADE_RESULT}
        />,
      );
      expect(screen.getByText(/↓ VBR 13:/)).toBeInTheDocument();
      // upgrade is 200 GB
      expect(screen.getByText(/200\s*GB/)).toBeInTheDocument();
    });

    it("hides the hero caption when storageSavings <= 0", () => {
      const noSavings = buildResult({ totalStorageTB: 12.5 });
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={{ success: true, data: noSavings.data }}
        />,
      );
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
    });

    it("hides the immutability annotation when immutabilitySavings <= 0", () => {
      const noImmutSavings = buildResult({
        performanceTierImmutabilityTaxGB: 250,
      });
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={{ success: true, data: noImmutSavings.data }}
        />,
      );
      expect(screen.queryByText(/↓ VBR 13:/)).not.toBeInTheDocument();
    });
  });

  describe("SOBR-blocks-upgrade copy", () => {
    it("renders no caption when sobrBlocksUpgrade is true and no upgrade result is present", () => {
      render(<SizingResults result={MOCK_RESULT} sobrBlocksUpgrade />);
      expect(screen.queryByText(/Potentially save/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
      // Legacy static disclaimer is removed.
      expect(
        screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
      ).not.toBeInTheDocument();
    });

    it("shows actionable SOBR copy when an upgrade saves storage", () => {
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={MOCK_UPGRADE_RESULT}
          sobrBlocksUpgrade
        />,
      );
      // Standard non-SOBR copy is replaced.
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Potentially save/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /by upgrading to VBR 13 and transitioning SOBRs to direct Backup Copy jobs\./i,
        ),
      ).toBeInTheDocument();
      // Savings math (12.5 - 10.0 = 2.50 TB) appears in the caption span.
      // Scope tightly so we don't match the "12.50 TB" hero metric.
      expect(screen.getByText(/^2\.50 TB$/)).toBeInTheDocument();
      // Per-segment immutability annotation also surfaces under SOBR — the
      // savings principle applies consistently across both UI surfaces.
      expect(screen.getByText(/↓ VBR 13:/)).toBeInTheDocument();
    });
  });
});
