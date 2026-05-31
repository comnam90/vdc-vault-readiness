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

vi.mock("@/lib/growth-projector", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/growth-projector")>();
  return {
    ...actual,
    generateGrowthSeries: vi.fn(),
  };
});

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
    buffer: 0,
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
  const defaultControlledProps = {
    result: null as VmAgentResponse | null,
    upgradeResult: null as VmAgentResponse | null,
    growthSeries: null as GrowthSeriesPoint[] | null,
    error: null as string | null,
    loading: false,
    hasConsented: false,
    onConsentGiven: vi.fn(),
    onCalculate: vi.fn().mockResolvedValue(undefined),
  };

  it("renders all 5 calculator input labels", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

    // Source Data: 2 decimal places
    expect(screen.getByText("123.46 TB")).toBeInTheDocument();

    // Daily Change Rate: percentage
    expect(screen.getByText("13.33%")).toBeInTheDocument();

    // Immutability: default 30 days
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.queryByText("(VDC Vault minimum)")).not.toBeInTheDocument();

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

    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0); // Should appear multiple times

    expect(screen.getByText("None configured")).toBeInTheDocument(); // For GFS
  });

  it("renders the advanced calculator link correctly", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

    const { container } = render(
      <CalculatorInputs data={mockData} {...defaultControlledProps} />,
    );
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

    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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
    render(
      <CalculatorInputs
        data={mockData}
        excludedJobNames={excluded}
        {...defaultControlledProps}
      />,
    );
    // Only Job A: 1024 GB = 1 TB
    expect(screen.getByText("1.00 TB")).toBeInTheDocument();
  });

  it("shows Get Sizing Estimate button", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    expect(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    ).toBeInTheDocument();
  });

  it("opens consent dialog when button clicked (no API call yet)", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(defaultControlledProps.onCalculate).not.toHaveBeenCalled();
  });

  it("shows sizing results when result prop is provided", () => {
    render(
      <CalculatorInputs
        data={mockData}
        {...defaultControlledProps}
        result={MOCK_API_RESULT}
      />,
    );
    expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
  });

  it("shows error message when error prop is provided", () => {
    render(
      <CalculatorInputs
        data={mockData}
        {...defaultControlledProps}
        error="Could not retrieve sizing estimate. Check your connection and try again."
      />,
    );
    expect(screen.getByText(/could not retrieve sizing/i)).toBeInTheDocument();
  });

  describe("VBR upgrade savings comparison", () => {
    it("renders inline upgrade annotation when result and upgradeResult are provided for VBR 12", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr12}
          {...defaultControlledProps}
          result={MOCK_V12_RESULT}
          upgradeResult={MOCK_V13_RESULT}
        />,
      );
      expect(
        screen.getByText(/upgrade to VBR 13 could reduce this to/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });

    it("does NOT render UpgradeSavings for VBR 13 (upgradeResult is null)", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
          upgradeResult={null}
        />,
      );
      expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
      expect(screen.queryByText(/VBR 12 to VBR 13/i)).not.toBeInTheDocument();
    });

    it("renders SOBR-aware upgrade copy for VBR 12 with SOBRs", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr12WithSobr}
          {...defaultControlledProps}
          result={MOCK_V12_RESULT}
          upgradeResult={MOCK_V13_RESULT}
        />,
      );
      expect(screen.getByText(/Potentially save/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /by upgrading to VBR 13 and transitioning SOBRs to direct Backup Copy jobs\./i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
    });

    it("does NOT render legacy SOBR-blocks-upgrade note for VBR 13", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
        />,
      );
      expect(
        screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("growth series display", () => {
    it("renders the growth chart card when growthSeries prop is provided", () => {
      const growthSeries = [
        {
          name: "Year 1",
          daily: 1,
          weekly: 0.5,
          monthly: 0.5,
          yearly: 0.25,
          immutability: 0.1,
          buffer: 0,
          total: 2.35,
        },
      ];
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
          growthSeries={growthSeries}
        />,
      );
      expect(screen.getByText(/projected storage growth/i)).toBeInTheDocument();
    });

    it("does not render growth chart when growthSeries prop is null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
          growthSeries={null}
        />,
      );
      expect(
        screen.queryByText(/projected storage growth/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("active settings indicators", () => {
    it("renders below the metric grid (after Extended Retention)", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

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

      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);

      expect(
        screen.queryByRole("button", {
          name: /show retention distribution breakdown/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe("controlled consent behavior (new prop interface)", () => {
    const onConsentGiven = vi.fn();
    const onCalculate = vi.fn().mockResolvedValue(undefined);

    const baseControlledProps = {
      result: null as VmAgentResponse | null,
      upgradeResult: null as VmAgentResponse | null,
      growthSeries: null as GrowthSeriesPoint[] | null,
      error: null as string | null,
      loading: false,
      hasConsented: false,
      onConsentGiven,
      onCalculate,
    };

    beforeEach(() => {
      onConsentGiven.mockClear();
      onCalculate.mockClear();
    });

    it("shows 'Get Sizing Estimate' when result is null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={null}
        />,
      );
      expect(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      ).toBeInTheDocument();
    });

    it("shows 'Re-calculate' when result is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
        />,
      );
      expect(
        screen.getByRole("button", { name: /re-calculate/i }),
      ).toBeInTheDocument();
    });

    it("opens consent dialog when hasConsented is false and button is clicked", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          hasConsented={false}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onCalculate).not.toHaveBeenCalled();
    });

    it("calls onConsentGiven and onCalculate when consent dialog is accepted", async () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          hasConsented={false}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );
      expect(onConsentGiven).toHaveBeenCalledTimes(1);
      expect(onCalculate).toHaveBeenCalledTimes(1);
    });

    it("does not call onCalculate when consent dialog is declined", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          hasConsented={false}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /decline/i }));
      expect(onCalculate).not.toHaveBeenCalled();
      expect(onConsentGiven).not.toHaveBeenCalled();
    });

    it("calls onCalculate directly without dialog when hasConsented is true", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
          hasConsented={true}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      expect(onCalculate).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not call onConsentGiven when already consented and Re-calculate is clicked", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
          hasConsented={true}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      expect(onConsentGiven).not.toHaveBeenCalled();
    });

    it("shows SizingResults when result prop is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
        />,
      );
      expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
    });

    it("shows error alert when error prop is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          error="Could not retrieve sizing estimate. Check your connection and try again."
        />,
      );
      expect(
        screen.getByText(/could not retrieve sizing/i),
      ).toBeInTheDocument();
    });

    it("shows 'Calculating…' and disables button when loading is true", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          loading={true}
        />,
      );
      expect(screen.getByText(/calculating/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /calculating/i }),
      ).toBeDisabled();
    });

    it("renders VBR 12 upgrade annotation when upgradeResult is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr12}
          {...baseControlledProps}
          result={MOCK_V12_RESULT}
          upgradeResult={MOCK_V13_RESULT}
        />,
      );
      expect(
        screen.getByText(/upgrade to VBR 13 could reduce this to/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });
  });

  describe("immutability period inline edit", () => {
    beforeEach(() => {
      // Set retention to 99 so it doesn't conflict with "14 days" or "30 days"
      // text queries when immutability is edited to or resets to those values.
      // (null would seed retentionDays to the MINIMUM_RETENTION_DAYS fallback of 30.)
      vi.mocked(buildCalculatorSummary).mockReturnValue({
        ...defaultSummary,
        maxRetentionDays: 99,
        originalMaxRetentionDays: 99,
      });
    });

    it("renders a pencil button to edit the immutability period", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      expect(
        screen.getByRole("button", { name: /edit immutability period/i }),
      ).toBeInTheDocument();
    });

    it("clicking the pencil shows the number input and action buttons", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /cancel immutability period edit/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset to 30/i }),
      ).toBeInTheDocument();
    });

    it("confirm updates the displayed value and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      expect(screen.getByText("14 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("Enter key confirms and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Enter" });
      expect(screen.getByText("14 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("cancel reverts to the previous value and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", {
          name: /cancel immutability period edit/i,
        }),
      );
      expect(screen.getByText("30 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("Escape key cancels and reverts to the previous value", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Escape" });
      expect(screen.getByText("30 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("reset sets value back to 30 and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      // First set a custom value
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      expect(screen.getByText("14 days")).toBeInTheDocument();
      // Now open again and reset
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /reset to 30/i }));
      expect(screen.getByText("30 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("rejects a value of 0 — stays in edit mode without updating", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "0" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
      expect(screen.queryByText("0 days")).not.toBeInTheDocument();
    });

    it("pencil icon has text-primary class when override is active", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      expect(
        screen.getByRole("button", { name: /edit immutability period/i }),
      ).toHaveClass("text-primary");
    });

    it("passes the immutabilityDays override to onCalculate on button click", () => {
      const onCalculate = vi.fn().mockResolvedValue(undefined);
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          onCalculate={onCalculate}
          hasConsented={true}
          result={MOCK_API_RESULT}
        />,
      );
      // Set a custom value
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      // Trigger calculation
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      // beforeEach sets maxRetentionDays:99, gfsWeekly/Monthly/Yearly:1
      expect(onCalculate).toHaveBeenCalledWith({
        immutabilityDays: 14,
        retentionDays: 99,
        gfsWeekly: 1,
        gfsMonthly: 1,
        gfsYearly: 1,
      });
    });

    it("passes immutabilityDays to onCalculate when consent dialog is accepted", () => {
      const onCalculate = vi.fn().mockResolvedValue(undefined);
      const onConsentGiven = vi.fn();
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          onCalculate={onCalculate}
          onConsentGiven={onConsentGiven}
          hasConsented={false}
        />,
      );
      // Set a custom value
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "14" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      // Trigger consent flow
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );
      expect(onCalculate).toHaveBeenCalledWith({
        immutabilityDays: 14,
        retentionDays: 99,
        gfsWeekly: 1,
        gfsMonthly: 1,
        gfsYearly: 1,
      });
    });

    it("resets to the default when data changes", () => {
      const { rerender } = render(
        <CalculatorInputs data={mockData} {...defaultControlledProps} />,
      );
      // Set custom value
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      expect(screen.getByText("45 days")).toBeInTheDocument();
      // Re-render with different data (different backupServer Name drives dataKey)
      const newData = {
        ...mockData,
        backupServer: [{ Version: "13.0.1.1071", Name: "server-2" }],
      } as unknown as NormalizedDataset;
      rerender(<CalculatorInputs data={newData} {...defaultControlledProps} />);
      expect(screen.getByText("30 days")).toBeInTheDocument();
      expect(screen.queryByText("45 days")).not.toBeInTheDocument();
    });

    it("rejects a cleared (empty) input — stays in edit mode without updating", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit immutability period/i }),
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm immutability period/i }),
      );
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
  });

  describe("retention period inline edit", () => {
    // defaultSummary has maxRetentionDays: 14 — distinct from immutability's "30 days"

    it("renders a pencil button to edit the retention period", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      expect(
        screen.getByRole("button", { name: /edit retention/i }),
      ).toBeInTheDocument();
    });

    it("clicking the pencil shows the number input and action buttons", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /confirm retention/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel retention edit/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset retention to/i }),
      ).toBeInTheDocument();
    });

    it("confirm updates the displayed value and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      expect(screen.getByText("45 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("Enter key confirms and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Enter" });
      expect(screen.getByText("45 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("cancel reverts to the previous value and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /cancel retention edit/i }),
      );
      expect(screen.getByText("14 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("Escape key cancels and reverts to the previous value", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Escape" });
      expect(screen.getByText("14 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("reset sets value back to the file-aggregated value and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      // First set a custom value
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      expect(screen.getByText("45 days")).toBeInTheDocument();
      // Now open again and reset
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /reset retention to/i }),
      );
      expect(screen.getByText("14 days")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("rejects a value below MINIMUM_RETENTION_DAYS — stays in edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "29" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
      expect(screen.queryByText("29 days")).not.toBeInTheDocument();
    });

    it("rejects a cleared (empty) input — stays in edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("pencil icon has text-primary class when override is active", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      expect(
        screen.getByRole("button", { name: /edit retention/i }),
      ).toHaveClass("text-primary");
    });

    it("resets to the file-aggregated value when data changes", () => {
      const { rerender } = render(
        <CalculatorInputs data={mockData} {...defaultControlledProps} />,
      );
      // Set custom value
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      expect(screen.getByText("45 days")).toBeInTheDocument();
      // Re-render with different data
      const newData = {
        ...mockData,
        backupServer: [{ Version: "13.0.1.1071", Name: "server-2" }],
      } as unknown as NormalizedDataset;
      rerender(<CalculatorInputs data={newData} {...defaultControlledProps} />);
      expect(screen.getByText("14 days")).toBeInTheDocument();
      expect(screen.queryByText("45 days")).not.toBeInTheDocument();
    });

    it("passes retentionDays override to onCalculate on button click", () => {
      const onCalculate = vi.fn().mockResolvedValue(undefined);
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          onCalculate={onCalculate}
          hasConsented={true}
          result={MOCK_API_RESULT}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /edit retention/i }));
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "45" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm retention/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      // defaultSummary has immutabilityDays:30 (constant), gfsWeekly/Monthly/Yearly:1
      expect(onCalculate).toHaveBeenCalledWith({
        immutabilityDays: 30,
        retentionDays: 45,
        gfsWeekly: 1,
        gfsMonthly: 1,
        gfsYearly: 1,
      });
    });
  });

  describe("extended retention (GFS) inline edit", () => {
    // defaultSummary has gfsWeekly:1, gfsMonthly:1, gfsYearly:1
    // so initial display is "Weekly: 1, Monthly: 1, Yearly: 1"

    it("renders a pencil button to edit GFS retention", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      expect(
        screen.getByRole("button", { name: /edit extended retention/i }),
      ).toBeInTheDocument();
    });

    it("clicking the pencil shows three spinbuttons and action buttons", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
      expect(
        screen.getByRole("button", { name: /confirm gfs/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel gfs edit/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset gfs to/i }),
      ).toBeInTheDocument();
    });

    it("confirm updates the composite display and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [weekly, monthly, yearly] = screen.getAllByRole("spinbutton");
      fireEvent.change(weekly, { target: { value: "4" } });
      fireEvent.change(monthly, { target: { value: "12" } });
      fireEvent.change(yearly, { target: { value: "7" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      expect(
        screen.getByText("Weekly: 4, Monthly: 12, Yearly: 7"),
      ).toBeInTheDocument();
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    });

    it("Enter key on any input confirms all three values", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [weekly] = screen.getAllByRole("spinbutton");
      fireEvent.change(weekly, { target: { value: "4" } });
      fireEvent.keyDown(weekly, { key: "Enter" });
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    });

    it("cancel reverts to the previous values and exits edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [weekly] = screen.getAllByRole("spinbutton");
      fireEvent.change(weekly, { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: /cancel gfs edit/i }));
      expect(
        screen.getByText("Weekly: 1, Monthly: 1, Yearly: 1"),
      ).toBeInTheDocument();
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    });

    it("Escape key on any input cancels and reverts", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [weekly] = screen.getAllByRole("spinbutton");
      fireEvent.change(weekly, { target: { value: "4" } });
      fireEvent.keyDown(weekly, { key: "Escape" });
      expect(
        screen.getByText("Weekly: 1, Monthly: 1, Yearly: 1"),
      ).toBeInTheDocument();
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    });

    it("reset restores all three values to file-aggregated values", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [w1, m1, y1] = screen.getAllByRole("spinbutton");
      fireEvent.change(w1, { target: { value: "4" } });
      fireEvent.change(m1, { target: { value: "12" } });
      fireEvent.change(y1, { target: { value: "7" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /reset gfs to/i }));
      expect(
        screen.getByText("Weekly: 1, Monthly: 1, Yearly: 1"),
      ).toBeInTheDocument();
    });

    it("allows a GFS value of 0 (disables that tier)", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [, , yearly] = screen.getAllByRole("spinbutton");
      fireEvent.change(yearly, { target: { value: "0" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    });

    it("rejects a negative GFS value — stays in edit mode", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [, monthly] = screen.getAllByRole("spinbutton");
      fireEvent.change(monthly, { target: { value: "-1" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
    });

    it("pencil icon has text-primary class when any GFS value is overridden", () => {
      render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [, , yearly] = screen.getAllByRole("spinbutton");
      fireEvent.change(yearly, { target: { value: "7" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      expect(
        screen.getByRole("button", { name: /edit extended retention/i }),
      ).toHaveClass("text-primary");
    });

    it("resets to file-aggregated values when data changes", () => {
      const { rerender } = render(
        <CalculatorInputs data={mockData} {...defaultControlledProps} />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [w, m, y] = screen.getAllByRole("spinbutton");
      fireEvent.change(w, { target: { value: "4" } });
      fireEvent.change(m, { target: { value: "12" } });
      fireEvent.change(y, { target: { value: "7" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      expect(
        screen.getByText("Weekly: 4, Monthly: 12, Yearly: 7"),
      ).toBeInTheDocument();
      const newData = {
        ...mockData,
        backupServer: [{ Version: "13.0.1.1071", Name: "server-2" }],
      } as unknown as NormalizedDataset;
      rerender(<CalculatorInputs data={newData} {...defaultControlledProps} />);
      expect(
        screen.getByText("Weekly: 1, Monthly: 1, Yearly: 1"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Weekly: 4, Monthly: 12, Yearly: 7"),
      ).not.toBeInTheDocument();
    });

    it("passes GFS overrides to onCalculate on button click", () => {
      const onCalculate = vi.fn().mockResolvedValue(undefined);
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          onCalculate={onCalculate}
          hasConsented={true}
          result={MOCK_API_RESULT}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /edit extended retention/i }),
      );
      const [w, m, y] = screen.getAllByRole("spinbutton");
      fireEvent.change(w, { target: { value: "4" } });
      fireEvent.change(m, { target: { value: "12" } });
      fireEvent.change(y, { target: { value: "7" } });
      fireEvent.click(screen.getByRole("button", { name: /confirm gfs/i }));
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      // defaultSummary has immutabilityDays:30 (constant), maxRetentionDays:14
      expect(onCalculate).toHaveBeenCalledWith({
        immutabilityDays: 30,
        retentionDays: 14,
        gfsWeekly: 4,
        gfsMonthly: 12,
        gfsYearly: 7,
      });
    });
  });

  describe("storage buffer integration", () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    it("grosses up SizingResults display when bufferEnabled=true in settings", async () => {
      const { STORAGE_KEY, __resetSettingsStoreForTests } =
        await import("@/hooks/use-settings");
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ bufferEnabled: true, bufferPercent: 25 }),
      );
      __resetSettingsStoreForTests();
      try {
        render(
          <CalculatorInputs
            data={mockDataVbr13}
            {...defaultControlledProps}
            result={MOCK_API_RESULT}
          />,
        );

        // 12.5 TB × (1 / (1 - 0.25)) = 16.67 TB
        expect(screen.getByText(/16\.67 TB/i)).toBeInTheDocument();
      } finally {
        window.localStorage.clear();
        __resetSettingsStoreForTests();
      }
    });

    it("shows un-buffered total when bufferEnabled=false (default)", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
        />,
      );

      expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
    });
  });
});
