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

vi.mock("@/lib/growth-projector", () => ({
  generateGrowthSeries: vi.fn(),
}));

import { callVmAgentApi } from "@/lib/veeam-api";
import { generateGrowthSeries } from "@/lib/growth-projector";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

const SAMPLE_GROWTH: GrowthSeriesPoint[] = [
  {
    name: "Year 1",
    daily: 1,
    weekly: 0.5,
    monthly: 0.5,
    yearly: 0.25,
    immutability: 0.1,
    total: 2.35,
  },
];

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
  sourceDataBreakdown: [],
  gfsDistribution: [],
  retentionDistribution: [],
};

beforeEach(() => {
  vi.mocked(buildCalculatorSummary).mockReturnValue(defaultSummary);
  vi.mocked(callVmAgentApi).mockReset();
  vi.mocked(generateGrowthSeries).mockReset();
  vi.mocked(generateGrowthSeries).mockResolvedValue(SAMPLE_GROWTH);
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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
      sourceDataBreakdown: [],
      gfsDistribution: [],
      retentionDistribution: [],
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

  it("opens consent dialog when button clicked (no API call yet)", () => {
    render(<CalculatorInputs data={mockData} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(vi.mocked(callVmAgentApi)).not.toHaveBeenCalled();
  });

  it("does not call API when Decline is clicked", () => {
    render(<CalculatorInputs data={mockData} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(vi.mocked(callVmAgentApi)).not.toHaveBeenCalled();
  });

  it("shows sizing results after accepting consent dialog", async () => {
    vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);
    render(<CalculatorInputs data={mockData} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /accept & calculate/i }),
    );
    expect(await screen.findByText(/12.50 TB/)).toBeInTheDocument();
  });

  it("shows error message on API failure after accepting consent", async () => {
    vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("Network error"));
    render(<CalculatorInputs data={mockData} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /accept & calculate/i }),
    );
    expect(
      await screen.findByText(/could not retrieve sizing/i),
    ).toBeInTheDocument();
  });

  describe("VBR upgrade savings comparison", () => {
    it("renders inline upgrade annotation when VBR 12 + no SOBRs + API succeeds", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      // Inline hero annotation: "Upgrade to VBR 13 could reduce this to 12.50 TB (saving 2.50 TB)"
      expect(
        await screen.findByText(/upgrade to VBR 13 could reduce this to/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });

    it("makes two API calls for VBR 12 + no SOBRs", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
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
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/12\.50 TB/);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/VBR 12 to VBR 13/i)).not.toBeInTheDocument();
    });

    it("makes two API calls and renders SOBR-aware copy for VBR 12 with SOBRs", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12WithSobr} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      // Hero shows the actionable SOBR copy with savings math (15 - 12.5 = 2.50 TB).
      expect(await screen.findByText(/Potentially save/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /by upgrading to VBR 13 and transitioning SOBRs to direct Backup Copy jobs\./i,
        ),
      ).toBeInTheDocument();
      // Two parallel calls now fire under SOBR (v12 + v13 comparison).
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(2);
      // Standard non-SOBR copy is suppressed.
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
      // Legacy static disclaimer is removed.
      expect(
        screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
      ).not.toBeInTheDocument();
    });

    it("does NOT render any upgrade copy for VBR 12 without SOBRs when SOBR copy would be wrong", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/saving 2\.50 TB/i);
      // Standard, not SOBR-aware.
      expect(screen.queryByText(/Potentially save/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
      ).not.toBeInTheDocument();
    });

    it("does NOT render the legacy SOBR-blocks-upgrade note for VBR 13", async () => {
      vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);

      render(<CalculatorInputs data={mockDataVbr13} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/12\.50 TB/);
      expect(
        screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
      ).not.toBeInTheDocument();
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
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/saving 2\.50 TB/i);

      // Re-calculate (button text changes after first result)
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/saving 2\.50 TB/i);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(4);
    });
  });

  describe("growth series integration", () => {
    it("calls generateGrowthSeries when the user accepts the consent dialog", async () => {
      vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);

      render(<CalculatorInputs data={mockDataVbr13} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/12\.50 TB/);
      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
    });

    it("does NOT call generateGrowthSeries on settings change alone", async () => {
      const { __resetSettingsStoreForTests } =
        await import("@/hooks/use-settings");
      window.localStorage.clear();
      __resetSettingsStoreForTests();

      const { rerender } = render(<CalculatorInputs data={mockDataVbr13} />);
      // Render again to simulate a re-render from any settings tweak before
      // the user clicks the button.
      rerender(<CalculatorInputs data={mockDataVbr13} />);

      expect(vi.mocked(generateGrowthSeries)).not.toHaveBeenCalled();
      expect(vi.mocked(callVmAgentApi)).not.toHaveBeenCalled();
    });

    it("fires the sizing call and the growth series concurrently (Promise.all)", async () => {
      let resolveSizing!: (v: VmAgentResponse) => void;
      let resolveGrowth!: (v: GrowthSeriesPoint[]) => void;
      vi.mocked(callVmAgentApi).mockImplementationOnce(
        () =>
          new Promise<VmAgentResponse>((resolve) => {
            resolveSizing = resolve;
          }),
      );
      vi.mocked(generateGrowthSeries).mockImplementationOnce(
        () =>
          new Promise<GrowthSeriesPoint[]>((resolve) => {
            resolveGrowth = resolve;
          }),
      );

      render(<CalculatorInputs data={mockDataVbr13} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      // Both calls must be in flight before either resolves.
      await Promise.resolve();
      await Promise.resolve();
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);

      resolveSizing(MOCK_API_RESULT);
      resolveGrowth(SAMPLE_GROWTH);

      await screen.findByText(/12\.50 TB/);
    });

    it("fires v12 sizing + v13 sizing + growth series concurrently for VBR 12 + no SOBR", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      render(<CalculatorInputs data={mockDataVbr12} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/saving 2\.50 TB/i);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
    });

    it("renders the growth chart card after a successful estimate", async () => {
      vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);

      render(<CalculatorInputs data={mockDataVbr13} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      await screen.findByText(/12\.50 TB/);
      expect(screen.getByText(/projected storage growth/i)).toBeInTheDocument();
    });

    it("propagates a growth-series rejection through the existing error path", async () => {
      vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);
      vi.mocked(generateGrowthSeries).mockRejectedValueOnce(new Error("boom"));

      render(<CalculatorInputs data={mockDataVbr13} />);
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );

      expect(
        await screen.findByText(/could not retrieve sizing/i),
      ).toBeInTheDocument();
    });
  });

  describe("active settings indicators", () => {
    it("renders below the metric grid (after Extended Retention)", () => {
      render(<CalculatorInputs data={mockData} />);

      const indicators = screen.getByTestId("settings-indicators");
      const extendedRetentionLabel = screen.getByText(/extended retention/i);

      // Settings indicators must follow the Extended Retention metric in DOM order.
      const relation =
        extendedRetentionLabel.compareDocumentPosition(indicators);
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("shows the Target badge by default and hides growth + cap badges", async () => {
      const { __resetSettingsStoreForTests } =
        await import("@/hooks/use-settings");
      window.localStorage.clear();
      __resetSettingsStoreForTests();

      render(<CalculatorInputs data={mockData} />);

      const indicators = screen.getByTestId("settings-indicators");
      expect(indicators).toHaveTextContent(/target: azure/i);
      expect(indicators).not.toHaveTextContent(/growth:/i);
      expect(indicators).not.toHaveTextContent(/retention cap:/i);
    });

    it("renders growth and retention-cap badges when those overrides are active", async () => {
      const { STORAGE_KEY, __resetSettingsStoreForTests } =
        await import("@/hooks/use-settings");
      window.localStorage.clear();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          targetCloud: "AWS",
          growthPercent: 10,
          growthYears: 3,
          limitCalculationYears: 1,
        }),
      );
      __resetSettingsStoreForTests();

      render(<CalculatorInputs data={mockData} />);

      const indicators = screen.getByTestId("settings-indicators");
      expect(indicators).toHaveTextContent(/target: aws/i);
      expect(indicators).toHaveTextContent(/growth: 10% \(3y\)/i);
      expect(indicators).toHaveTextContent(/retention cap: 1y/i);

      window.localStorage.clear();
      __resetSettingsStoreForTests();
    });

    it("includes the months segment in the retention-cap badge when months > 0", async () => {
      const { STORAGE_KEY, __resetSettingsStoreForTests } =
        await import("@/hooks/use-settings");
      window.localStorage.clear();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          limitCalculationYears: 2,
          limitCalculationMonths: 6,
        }),
      );
      __resetSettingsStoreForTests();

      render(<CalculatorInputs data={mockData} />);

      const indicators = screen.getByTestId("settings-indicators");
      expect(indicators).toHaveTextContent(/retention cap: 2y 6m/i);

      window.localStorage.clear();
      __resetSettingsStoreForTests();
    });

    it("renders the retention-cap badge with months only when years is 0", async () => {
      const { STORAGE_KEY, __resetSettingsStoreForTests } =
        await import("@/hooks/use-settings");
      window.localStorage.clear();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          limitCalculationYears: 0,
          limitCalculationMonths: 3,
        }),
      );
      __resetSettingsStoreForTests();

      render(<CalculatorInputs data={mockData} />);

      const indicators = screen.getByTestId("settings-indicators");
      expect(indicators).toHaveTextContent(/retention cap: 3m/i);
      expect(indicators).not.toHaveTextContent(/0y/i);

      window.localStorage.clear();
      __resetSettingsStoreForTests();
    });
  });

  describe("breakdown hover cards", () => {
    it("renders the source data breakdown trigger when the array is non-empty", () => {
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        sourceDataBreakdown: [
          { type: "VMware Backup", tb: 0.5 },
          { type: "Agent Backup", tb: 1.0 },
        ],
      });

      render(<CalculatorInputs data={mockData} />);

      expect(
        screen.getByRole("button", {
          name: /show source data breakdown/i,
        }),
      ).toBeInTheDocument();
    });

    it("does not render the source data breakdown trigger when the array is empty", () => {
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        sourceDataBreakdown: [],
      });

      render(<CalculatorInputs data={mockData} />);

      expect(
        screen.queryByRole("button", {
          name: /show source data breakdown/i,
        }),
      ).not.toBeInTheDocument();
    });

    it("renders the GFS distribution trigger when the array is non-empty", () => {
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        gfsDistribution: [{ policy: "4W | 12M | 1Y", count: 3 }],
      });

      render(<CalculatorInputs data={mockData} />);

      expect(
        screen.getByRole("button", {
          name: /show gfs distribution breakdown/i,
        }),
      ).toBeInTheDocument();
    });

    it("does not render the GFS distribution trigger when the array is empty", () => {
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        gfsDistribution: [],
      });

      render(<CalculatorInputs data={mockData} />);

      expect(
        screen.queryByRole("button", {
          name: /show gfs distribution breakdown/i,
        }),
      ).not.toBeInTheDocument();
    });

    it("renders distinct rows without duplicate-key warnings when GFS policies share a job count", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        gfsDistribution: [
          { policy: "4W | 1Y", count: 3 },
          { policy: "12M", count: 3 },
        ],
      });

      render(<CalculatorInputs data={mockData} />);

      const trigger = screen.getByRole("button", {
        name: /show gfs distribution breakdown/i,
      });
      fireEvent.pointerEnter(trigger);

      // Both policy rows must render — distinct keys must not collapse them.
      expect(await screen.findByText("4W | 1Y")).toBeInTheDocument();
      expect(screen.getByText("12M")).toBeInTheDocument();
      // Two policies, both with count 3, share the same `left` text.
      expect(screen.getAllByText("3 jobs")).toHaveLength(2);

      const duplicateKeyWarnings = errorSpy.mock.calls.filter((args) =>
        args.some(
          (arg) =>
            typeof arg === "string" &&
            arg.includes("two children with the same key"),
        ),
      );
      expect(duplicateKeyWarnings).toEqual([]);

      errorSpy.mockRestore();
    });

    it("renders the retention distribution trigger when the array is non-empty", () => {
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        retentionDistribution: [
          { days: 14, count: 3 },
          { days: 7, count: 1 },
        ],
      });

      render(<CalculatorInputs data={mockData} />);

      expect(
        screen.getByRole("button", {
          name: /show retention distribution breakdown/i,
        }),
      ).toBeInTheDocument();
    });

    it("does not render the retention distribution trigger when the array is empty", () => {
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        retentionDistribution: [],
      });

      render(<CalculatorInputs data={mockData} />);

      expect(
        screen.queryByRole("button", {
          name: /show retention distribution breakdown/i,
        }),
      ).not.toBeInTheDocument();
    });
  });
});
