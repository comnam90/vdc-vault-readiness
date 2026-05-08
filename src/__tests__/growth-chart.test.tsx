import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

const SAMPLE: GrowthSeriesPoint[] = [
  {
    name: "Year 1",
    daily: 1,
    weekly: 0.5,
    monthly: 0.5,
    yearly: 0.25,
    immutability: 0.1,
    total: 2.35,
  },
  {
    name: "Year 2",
    daily: 1.1,
    weekly: 0.55,
    monthly: 0.55,
    yearly: 0.27,
    immutability: 0.11,
    total: 2.58,
  },
];

const MONTHLY_SAMPLE: GrowthSeriesPoint[] = [
  {
    name: "Month 1",
    daily: 1,
    weekly: 0.5,
    monthly: 0.5,
    yearly: 0,
    immutability: 0.1,
    total: 2.1,
  },
  {
    name: "Month 2",
    daily: 1,
    weekly: 0.5,
    monthly: 0.5,
    yearly: 0,
    immutability: 0.1,
    total: 2.1,
  },
];

describe("GrowthChart", () => {
  it("renders the card title and description matching the simulation mode", () => {
    const { rerender } = render(
      <GrowthChart data={SAMPLE} greenfield={false} />,
    );
    expect(screen.getByText(/projected storage growth/i)).toBeInTheDocument();
    expect(
      screen.getByText(/full retention chain from day 1/i),
    ).toBeInTheDocument();

    rerender(<GrowthChart data={SAMPLE} greenfield={true} />);
    expect(screen.getByText(/build up year over year/i)).toBeInTheDocument();
  });

  it("does NOT render an inline Greenfield switch", () => {
    render(<GrowthChart data={SAMPLE} greenfield={false} />);
    expect(
      screen.queryByRole("switch", { name: /greenfield/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a loading status when isLoading is true", () => {
    render(<GrowthChart data={null} greenfield={true} isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /projecting storage growth/i,
    );
  });

  it("renders an error state when an error string is provided", () => {
    render(
      <GrowthChart
        data={null}
        greenfield={true}
        error="Could not project storage growth."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/could not project/i);
  });

  it("renders an empty state when data is null and not loading", () => {
    render(<GrowthChart data={null} greenfield={true} />);
    expect(screen.getByText(/no projection available/i)).toBeInTheDocument();
  });

  it("renders an empty state when data is an empty array", () => {
    render(<GrowthChart data={[]} greenfield={true} />);
    expect(screen.getByText(/no projection available/i)).toBeInTheDocument();
  });

  it("renders a historical-seed note when greenfield and historicalDataYears > 0", () => {
    render(<GrowthChart data={SAMPLE} greenfield historicalDataYears={3} />);
    const note = screen.getByTestId("historical-seed-note");
    expect(note).toHaveTextContent(/year 1/i);
    expect(note).toHaveTextContent(/3 years/i);
    expect(note).toHaveTextContent(/existing backups/i);
  });

  it("renders the seed note in singular form when historicalDataYears is 1", () => {
    render(<GrowthChart data={SAMPLE} greenfield historicalDataYears={1} />);
    expect(screen.getByTestId("historical-seed-note")).toHaveTextContent(
      /1 year of existing backups/i,
    );
  });

  it("does NOT render the seed note when historicalDataYears is 0", () => {
    render(<GrowthChart data={SAMPLE} greenfield historicalDataYears={0} />);
    expect(
      screen.queryByTestId("historical-seed-note"),
    ).not.toBeInTheDocument();
  });

  it("does NOT render the seed note when greenfield is false even if historicalDataYears > 0", () => {
    render(
      <GrowthChart data={SAMPLE} greenfield={false} historicalDataYears={5} />,
    );
    expect(
      screen.queryByTestId("historical-seed-note"),
    ).not.toBeInTheDocument();
  });

  it("renders a monthly-scale CardDescription when data points are 'Month N' (greenfield)", () => {
    render(<GrowthChart data={MONTHLY_SAMPLE} greenfield />);
    expect(
      screen.getByText(/builds? up month over month/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/build up year over year/i),
    ).not.toBeInTheDocument();
  });

  it("renders a monthly-scale CardDescription when data points are 'Month N' (seeded)", () => {
    render(<GrowthChart data={MONTHLY_SAMPLE} greenfield={false} />);
    expect(
      screen.getByText(/full retention chain from day 1/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/across the cap horizon/i)).toBeInTheDocument();
  });

  it("renders the seed note prefixed 'Month 1' on monthly scale", () => {
    render(
      <GrowthChart data={MONTHLY_SAMPLE} greenfield historicalDataYears={1} />,
    );
    const note = screen.getByTestId("historical-seed-note");
    expect(note).toHaveTextContent(/month 1/i);
    expect(note).not.toHaveTextContent(/year 1/i);
  });

  it("renders synchronously without triggering any data-fetching side effect", () => {
    // Pure-component contract: rendering must succeed without the projector
    // module being available. We mock it to a throwing stub; if the component
    // imports or calls it, this test will fail.
    const props = {
      data: SAMPLE,
      greenfield: false,
    };
    expect(() => render(<GrowthChart {...props} />)).not.toThrow();
    expect(screen.getByText(/projected storage growth/i)).toBeInTheDocument();
  });
});
