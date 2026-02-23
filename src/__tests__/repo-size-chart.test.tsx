import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

import { RepoSizeChart } from "@/components/dashboard/repo-size-chart";
import type { RepoChartDatum } from "@/lib/chart-selectors";

describe("RepoSizeChart", () => {
  it("renders heading", () => {
    const data: RepoChartDatum[] = [{ repoName: "Repo A", totalTB: 2 }];
    render(<RepoSizeChart data={data} />);
    expect(screen.getByText(/source size by repository/i)).toBeInTheDocument();
  });

  it("returns null for empty data", () => {
    const { container } = render(<RepoSizeChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
