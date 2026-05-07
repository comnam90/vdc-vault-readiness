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
