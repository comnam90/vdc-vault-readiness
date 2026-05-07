import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as projector from "@/lib/growth-projector";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { makeJob, makeSession, makeSettings } from "./fixtures";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

vi.mock("@/lib/growth-projector", async () => {
  const actual = await vi.importActual<typeof projector>(
    "@/lib/growth-projector",
  );
  return {
    ...actual,
    generateGrowthSeries: vi.fn(),
  };
});
const generateGrowthSeries = vi.mocked(projector.generateGrowthSeries);

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

const baseProps = {
  jobs: [makeJob({ JobName: "Job A" })],
  sessions: [makeSession({ JobName: "Job A" })],
  excludedJobNames: new Set<string>(),
  settings: makeSettings({ limitCalculationYears: 2 }),
  jobCount: 1,
  vbrVersion: "13.0.1.1071",
  greenfieldSimulation: false,
  onGreenfieldChange: vi.fn(),
};

beforeEach(() => {
  generateGrowthSeries.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GrowthChart", () => {
  it("renders a loading status while the projection is in flight", async () => {
    let resolve!: (data: GrowthSeriesPoint[]) => void;
    generateGrowthSeries.mockReturnValueOnce(
      new Promise<GrowthSeriesPoint[]>((r) => {
        resolve = r;
      }),
    );

    render(<GrowthChart {...baseProps} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /projecting storage growth/i,
    );

    resolve(SAMPLE);
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("renders the empty state when there are no jobs", () => {
    render(<GrowthChart {...baseProps} jobs={[]} />);
    expect(screen.getByText(/add backup jobs/i)).toBeInTheDocument();
    expect(generateGrowthSeries).not.toHaveBeenCalled();
  });

  it("renders the chart card with the title and Greenfield switch", async () => {
    generateGrowthSeries.mockResolvedValueOnce(SAMPLE);
    render(<GrowthChart {...baseProps} />);

    expect(
      await screen.findByText(/projected storage growth/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /greenfield/i }),
    ).toBeInTheDocument();
  });

  it("renders an error state when the projection fails", async () => {
    generateGrowthSeries.mockRejectedValueOnce(new Error("boom"));
    render(<GrowthChart {...baseProps} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not project/i,
    );
  });

  it("invokes onGreenfieldChange when the Switch is toggled", async () => {
    generateGrowthSeries.mockResolvedValue(SAMPLE);
    const onGreenfieldChange = vi.fn();
    render(
      <GrowthChart {...baseProps} onGreenfieldChange={onGreenfieldChange} />,
    );

    fireEvent.click(screen.getByRole("switch", { name: /greenfield/i }));
    expect(onGreenfieldChange).toHaveBeenCalledWith(true);
  });

  it("describes greenfield vs seeded mode in the card description", async () => {
    generateGrowthSeries.mockResolvedValue(SAMPLE);
    const { rerender } = render(<GrowthChart {...baseProps} />);
    expect(
      screen.getByText(/full retention chain from day 1/i),
    ).toBeInTheDocument();

    rerender(<GrowthChart {...baseProps} greenfieldSimulation={true} />);
    expect(screen.getByText(/build up year over year/i)).toBeInTheDocument();
  });
});
