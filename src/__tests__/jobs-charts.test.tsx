import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock recharts — jsdom cannot render SVG
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`bar-${dataKey}`} />
  ),
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div />,
}));

import { JobsCharts } from "@/components/dashboard/jobs-charts";
import type { EnrichedJob } from "@/types/enriched-job";

function makeJob(overrides: Partial<EnrichedJob> = {}): EnrichedJob {
  return {
    JobName: "Job",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "Repo",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: 1024,
    OnDiskGB: null,
    RetentionScheme: null,
    CompressionLevel: null,
    BlockSize: null,
    GfsEnabled: null,
    ActiveFullEnabled: null,
    SyntheticFullEnabled: null,
    BackupChainType: null,
    IndexingEnabled: null,
    sessionData: null,
    ...overrides,
  };
}

describe("JobsCharts", () => {
  it("renders source size by job type heading", () => {
    render(<JobsCharts jobs={[makeJob()]} />);
    expect(screen.getByText(/source size by job type/i)).toBeInTheDocument();
  });

  it("renders change rate distribution heading", () => {
    render(<JobsCharts jobs={[makeJob()]} />);
    expect(screen.getByText(/change rate distribution/i)).toBeInTheDocument();
  });

  it("renders recharts containers", () => {
    render(<JobsCharts jobs={[makeJob()]} />);
    expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
  });

  it("renders nothing when jobs array is empty", () => {
    const { container } = render(<JobsCharts jobs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
