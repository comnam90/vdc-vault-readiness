import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

import { RepoImmutabilityChart } from "@/components/dashboard/repo-immutability-chart";
import type { ImmutabilitySlice } from "@/lib/chart-selectors";

const MOCK_DATA: ImmutabilitySlice[] = [
  { name: "Immutable", count: 3, fill: "var(--color-primary)" },
  { name: "Not Immutable", count: 1, fill: "var(--color-destructive)" },
];

describe("RepoImmutabilityChart", () => {
  it("renders heading", () => {
    render(<RepoImmutabilityChart data={MOCK_DATA} />);
    expect(screen.getByText(/immutability coverage/i)).toBeInTheDocument();
  });

  it("renders a responsive container when data is non-zero", () => {
    render(<RepoImmutabilityChart data={MOCK_DATA} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("returns null when all counts are zero", () => {
    const empty: ImmutabilitySlice[] = [
      { name: "Immutable", count: 0, fill: "" },
      { name: "Not Immutable", count: 0, fill: "" },
    ];
    const { container } = render(<RepoImmutabilityChart data={empty} />);
    expect(container.firstChild).toBeNull();
  });
});
