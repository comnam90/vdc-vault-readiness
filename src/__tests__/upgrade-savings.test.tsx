import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UpgradeSavings } from "@/components/dashboard/upgrade-savings";
import type { VmAgentResponse } from "@/types/veeam-api";

function makeResponse(
  totalStorageTB: number,
  performanceTierImmutabilityTaxGB: number,
): VmAgentResponse {
  return {
    success: true,
    data: {
      totalStorageTB,
      proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
      repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
      transactions: {},
      performanceTierImmutabilityTaxGB,
      capacityTierImmutabilityTaxGB: 0,
    },
  };
}

describe("UpgradeSavings", () => {
  it("renders VBR 13 framing text in the card title", () => {
    render(
      <UpgradeSavings
        v12Result={makeResponse(15.0, 300)}
        v13Result={makeResponse(12.5, 250)}
      />,
    );

    // Title contains "Upgrade to VBR 13 Saves X.XX TB"
    expect(screen.getByText(/Upgrade to VBR 13/i)).toBeInTheDocument();
  });

  it("renders storage savings in TB (v12 total minus v13 total) in the title", () => {
    render(
      <UpgradeSavings
        v12Result={makeResponse(15.0, 300)}
        v13Result={makeResponse(12.5, 250)}
      />,
    );

    // 15.0 - 12.5 = 2.50 TB savings shown in card title
    expect(screen.getByText(/Saves 2\.50 TB/i)).toBeInTheDocument();
  });

  it("renders immutability overhead reduction in GB", () => {
    render(
      <UpgradeSavings
        v12Result={makeResponse(15.0, 300)}
        v13Result={makeResponse(12.5, 250)}
      />,
    );

    // 300 - 250 = 50 GB reduction
    const gbElements = screen.getAllByText(/50 GB/);
    expect(gbElements.length).toBeGreaterThan(0);
  });

  it("shows subtitle framing for upgrade context", () => {
    render(
      <UpgradeSavings
        v12Result={makeResponse(15.0, 300)}
        v13Result={makeResponse(12.5, 250)}
      />,
    );

    expect(screen.getByText(/VBR 12 to VBR 13/i)).toBeInTheDocument();
  });

  it("handles zero immutability overhead reduction gracefully", () => {
    render(
      <UpgradeSavings
        v12Result={makeResponse(15.0, 250)}
        v13Result={makeResponse(12.5, 250)}
      />,
    );

    const gbElements = screen.getAllByText(/0 GB/);
    expect(gbElements.length).toBeGreaterThan(0);
  });
});
