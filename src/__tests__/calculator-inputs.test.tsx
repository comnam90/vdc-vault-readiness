import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalculatorInputs } from "@/components/dashboard/calculator-inputs";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import type { NormalizedDataset } from "@/types/domain";
import type { VmAgentResponse } from "@/types/veeam-api";

// Mock the aggregator function
vi.mock("@/lib/calculator-aggregator", () => ({
  buildCalculatorSummary: vi.fn(),
}));

vi.mock("@/lib/veeam-api", () => ({
  callVmAgentApi: vi.fn(),
}));

import { callVmAgentApi } from "@/lib/veeam-api";

const mockData = {
  jobInfo: [],
  jobSessionSummary: [],
} as unknown as NormalizedDataset;

const mockDataVbr12 = {
  jobInfo: [],
  jobSessionSummary: [],
  backupServer: [{ Version: "12.1.2.456", Name: "Server" }],
  sobr: [],
} as unknown as NormalizedDataset;

const mockDataVbr13 = {
  jobInfo: [],
  jobSessionSummary: [],
  backupServer: [{ Version: "13.0.1.1071", Name: "Server" }],
  sobr: [],
} as unknown as NormalizedDataset;

const mockDataVbr12WithSobr = {
  jobInfo: [],
  jobSessionSummary: [],
  backupServer: [{ Version: "12.1.2.456", Name: "Server" }],
  sobr: [{ Name: "MySobr" }],
} as unknown as NormalizedDataset;

const MOCK_API_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 0,
    capacityTierImmutabilityTaxGB: 0,
  },
};

const MOCK_V12_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 15.0,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 300,
    capacityTierImmutabilityTaxGB: 0,
  },
};

const MOCK_V13_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 250,
    capacityTierImmutabilityTaxGB: 0,
  },
};

const defaultSummary = {
  totalSourceDataTB: 10.5,
  weightedAvgChangeRate: 5.2,
  immutabilityDays: 30,
  maxRetentionDays: 14,
  originalMaxRetentionDays: 14,
  gfsWeekly: 1,
  gfsMonthly: 1,
  gfsYearly: 1,
};

beforeEach(() => {
  vi.mocked(buildCalculatorSummary).mockReturnValue(defaultSummary);
  vi.mocked(callVmAgentApi).mockReset();
});

describe("CalculatorInputs", () => {
  it("renders all 5 calculator input labels", () => {
    render(<CalculatorInputs data={mockData} />);

    expect(screen.getByText("Source Data")).toBeInTheDocument();
    expect(screen.getByText("Daily Change Rate")).toBeInTheDocument();
    expect(screen.getByText("Immutability Period")).toBeInTheDocument();
    expect(screen.getByText("Retention")).toBeInTheDocument();
    expect(screen.getByText("Extended Retention")).toBeInTheDocument();
  });

  it("displays aggregated values correctly", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 123.456,
      weightedAvgChangeRate: 13.333,
      immutabilityDays: 30,
      maxRetentionDays: 14,
      originalMaxRetentionDays: 14,
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 7,
    });

    render(<CalculatorInputs data={mockData} />);

    // Source Data: 2 decimal places
    expect(screen.getByText("123.46 TB")).toBeInTheDocument();

    // Daily Change Rate: percentage
    expect(screen.getByText("13.33%")).toBeInTheDocument();

    // Immutability: hardcoded 30 days
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.getByText("(VDC Vault minimum)")).toBeInTheDocument();

    // Retention: days
    expect(screen.getByText("14 days")).toBeInTheDocument();

    // Extended Retention: GFS breakdown
    expect(
      screen.getByText("Weekly: 4, Monthly: 12, Yearly: 7"),
    ).toBeInTheDocument();
  });

  it("handles null values gracefully", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: null,
      weightedAvgChangeRate: null,
      immutabilityDays: 30,
      maxRetentionDays: null,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });

    render(<CalculatorInputs data={mockData} />);

    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0); // Should appear multiple times

    expect(screen.getByText("None configured")).toBeInTheDocument(); // For GFS
  });

  it("renders the advanced calculator link correctly", () => {
    render(<CalculatorInputs data={mockData} />);

    const link = screen.getByRole("link", {
      name: /advanced calculator/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.veeam.com/calculators/simple/vdc",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("handles empty data gracefully", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: null,
      weightedAvgChangeRate: null,
      immutabilityDays: 30,
      maxRetentionDays: null,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });

    const { container } = render(<CalculatorInputs data={mockData} />);
    expect(container).toBeInTheDocument();
  });

  it("shows retention floor subtext when original retention is below 30 days", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 10,
      weightedAvgChangeRate: 5,
      immutabilityDays: 30,
      maxRetentionDays: 30,
      originalMaxRetentionDays: 14,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });

    render(<CalculatorInputs data={mockData} />);

    expect(screen.getAllByText("30 days").length).toBeGreaterThan(0);
    expect(screen.getByText("(current: 14 days)")).toBeInTheDocument();
  });

  it("does not show retention floor subtext when original retention is 30 or more days", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 10,
      weightedAvgChangeRate: 5,
      immutabilityDays: 30,
      maxRetentionDays: 45,
      originalMaxRetentionDays: 45,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });

    render(<CalculatorInputs data={mockData} />);

    expect(screen.getByText("45 days")).toBeInTheDocument();
    expect(screen.queryByText(/current:/)).not.toBeInTheDocument();
  });

  it("does not show retention floor subtext when original retention is null", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 10,
      weightedAvgChangeRate: 5,
      immutabilityDays: 30,
      maxRetentionDays: 30,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });

    render(<CalculatorInputs data={mockData} />);

    expect(screen.queryByText(/current:/)).not.toBeInTheDocument();
  });

  it("filters excluded jobs from totals", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 1.0,
      weightedAvgChangeRate: 10,
      immutabilityDays: 30,
      maxRetentionDays: 30,
      originalMaxRetentionDays: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });
    const excluded = new Set(["Job B"]);
    render(<CalculatorInputs data={mockData} excludedJobNames={excluded} />);
    // Only Job A: 1024 GB = 1 TB
    expect(screen.getByText("1.00 TB")).toBeInTheDocument();
  });

  it("shows Get Sizing Estimate button", () => {
    render(<CalculatorInputs data={mockData} />);
    expect(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    ).toBeInTheDocument();
  });

  it("shows sizing results after successful API call", async () => {
    vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);
    render(<CalculatorInputs data={mockData} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    expect(await screen.findByText(/12.50 TB/)).toBeInTheDocument();
  });

  it("shows error message on API failure", async () => {
    vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("Network error"));
    render(<CalculatorInputs data={mockData} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    expect(
      await screen.findByText(/could not retrieve sizing/i),
    ).toBeInTheDocument();
  });

  describe("VBR upgrade savings comparison", () => {
    it("renders UpgradeSavings when VBR 12 + no SOBRs + API succeeds", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );

      // UpgradeSavings card title: "Upgrade to VBR 13 Saves 2.50 TB"
      expect(await screen.findByText(/Saves 2\.50 TB/i)).toBeInTheDocument();
      expect(screen.getByText(/VBR 12 to VBR 13/i)).toBeInTheDocument();
    });

    it("makes two API calls for VBR 12 + no SOBRs", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );

      await screen.findAllByText(/15\.00 TB/);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(2);
    });

    it("does NOT render UpgradeSavings for VBR 13", async () => {
      vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);

      render(<CalculatorInputs data={mockDataVbr13} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );

      await screen.findByText(/12\.50 TB/);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/VBR 12 to VBR 13/i)).not.toBeInTheDocument();
    });

    it("does NOT render UpgradeSavings for VBR 12 with SOBRs", async () => {
      vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);

      render(<CalculatorInputs data={mockDataVbr12WithSobr} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );

      await screen.findByText(/12\.50 TB/);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/VBR 12 to VBR 13/i)).not.toBeInTheDocument();
    });

    it("resets upgrade result when re-calculating", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );

      await screen.findByText(/Saves 2\.50 TB/i);

      // Re-calculate
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));

      await screen.findByText(/Saves 2\.50 TB/i);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(4);
    });
  });
});
