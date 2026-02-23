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
});
