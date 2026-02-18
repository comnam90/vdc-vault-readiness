import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CalculatorInputs } from "@/components/dashboard/calculator-inputs";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";

// Mock the aggregator function
vi.mock("@/lib/calculator-aggregator", () => ({
  buildCalculatorSummary: vi.fn(),
}));

describe("CalculatorInputs", () => {
  const mockData = {
    jobInfo: [],
    jobSessionSummary: [],
  } as unknown as NormalizedDataset;

  const mockValidations = [] as ValidationResult[];

  it("renders all 5 calculator input labels", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 10.5,
      weightedAvgChangeRate: 5.2,
      immutabilityDays: 30,
      maxRetentionDays: 14,
      originalMaxRetentionDays: 14,
      gfsWeekly: 1,
      gfsMonthly: 1,
      gfsYearly: 1,
    });

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

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

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

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

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0); // Should appear multiple times

    expect(screen.getByText("None configured")).toBeInTheDocument(); // For GFS
  });

  it("renders the CTA link correctly", () => {
    vi.mocked(buildCalculatorSummary).mockReturnValue({
      totalSourceDataTB: 10,
      weightedAvgChangeRate: 5,
      immutabilityDays: 30,
      maxRetentionDays: 14,
      originalMaxRetentionDays: 14,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    });

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

    const link = screen.getByRole("link", {
      name: /open vdc vault calculator/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.veeam.com/calculators/simple/vdc",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent(/opens in new tab/i);
  });

  it("handles empty data gracefully", () => {
    // Even if aggregator returns nulls, component should not crash
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

    const { container } = render(
      <CalculatorInputs data={mockData} validations={mockValidations} />,
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
    });

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

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

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

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

    render(<CalculatorInputs data={mockData} validations={mockValidations} />);

    expect(screen.queryByText(/current:/)).not.toBeInTheDocument();
  });
});
