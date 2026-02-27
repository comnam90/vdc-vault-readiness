import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SizingResults } from "@/components/dashboard/sizing-results";
import type { VmAgentResponse } from "@/types/veeam-api";

function buildResult(
  overrides: Partial<VmAgentResponse["data"]> = {},
): VmAgentResponse {
  return {
    ...MOCK_RESULT,
    data: { ...MOCK_RESULT.data, ...overrides },
  };
}

const MOCK_RESULT: VmAgentResponse = {
  success: true,
  data: {
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
  },
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
  },
};

describe("SizingResults", () => {
  it("displays total storage prominently", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText("12.50 TB")).toBeInTheDocument();
  });

  it("displays proxy compute", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText(/4 cores/i)).toBeInTheDocument();
    expect(screen.getByText(/8 GB RAM/i)).toBeInTheDocument();
  });

  it("displays repo compute", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText(/8 cores/i)).toBeInTheDocument();
    expect(screen.getByText(/16 GB RAM/i)).toBeInTheDocument();
  });

  it("displays immutability overhead", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText(/immutability overhead/i)).toBeInTheDocument();
    expect(screen.getByText(/250/)).toBeInTheDocument();
  });

  it("formats fractional immutability overhead to 2dp", () => {
    render(
      <SizingResults
        result={buildResult({
          performanceTierImmutabilityTaxGB: 678.6973615114821,
        })}
      />,
    );
    expect(screen.getByText(/678\.7\s*GB/)).toBeInTheDocument();
    expect(screen.queryByText(/678\.6973/)).not.toBeInTheDocument();
  });

  describe("inline upgrade annotations", () => {
    it("shows no upgrade annotation when upgradeResult is absent", () => {
      render(<SizingResults result={MOCK_RESULT} />);
      expect(screen.queryByText(/VBR 13/i)).not.toBeInTheDocument();
    });

    it("shows hero storage annotation with VBR 13 reduced TB when upgradeResult provided", () => {
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
    });

    it("shows storage savings amount in hero annotation", () => {
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={MOCK_UPGRADE_RESULT}
        />,
      );
      // 12.5 - 10.0 = 2.50 TB saving
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });

    it("shows immutability row annotation with VBR 13 savings", () => {
      render(
        <SizingResults
          result={MOCK_RESULT}
          upgradeResult={MOCK_UPGRADE_RESULT}
        />,
      );
      // 250 - 200 = 50 GB savings
      expect(
        screen.getByText(/saves 50 GB with VBR 13 upgrade/i),
      ).toBeInTheDocument();
    });

    it("hides hero annotation when storageSavings <= 0", () => {
      // upgradeResult has same totalStorageTB as result — no savings
      const noSavingsUpgrade = buildResult({ totalStorageTB: 12.5 });
      render(
        <SizingResults result={MOCK_RESULT} upgradeResult={noSavingsUpgrade} />,
      );
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
    });

    it("hides immutability annotation when immutabilitySavings <= 0", () => {
      // upgradeResult has same performanceTierImmutabilityTaxGB — no savings
      const noImmutSavings = buildResult({
        performanceTierImmutabilityTaxGB: 250,
      });
      render(
        <SizingResults result={MOCK_RESULT} upgradeResult={noImmutSavings} />,
      );
      expect(
        screen.queryByText(/saves.*GB with VBR 13 upgrade/i),
      ).not.toBeInTheDocument();
    });
  });
});
