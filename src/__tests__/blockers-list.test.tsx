import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BlockersList } from "@/components/dashboard/blockers-list";
import type { ValidationResult } from "@/types/validation";

const FAIL_RESULT: ValidationResult = {
  ruleId: "job-encryption",
  title: "Job Encryption Audit",
  status: "fail",
  message: "Vault requires source-side encryption.",
  affectedItems: ["Job A", "Job B", "Job C"],
};

const WARNING_RESULT: ValidationResult = {
  ruleId: "agent-workload",
  title: "Agent Workload Configuration",
  status: "warning",
  message: "Agent workloads detected.",
  affectedItems: ["Agent Job 1"],
};

describe("BlockersList", () => {
  it("renders fail validations as destructive alerts", () => {
    render(<BlockersList blockers={[FAIL_RESULT]} />);

    expect(screen.getByText("Job Encryption Audit")).toBeInTheDocument();
    expect(
      screen.getByText("Vault requires source-side encryption."),
    ).toBeInTheDocument();
  });

  it("renders warning validations", () => {
    render(<BlockersList blockers={[WARNING_RESULT]} />);

    expect(
      screen.getByText("Agent Workload Configuration"),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent workloads detected.")).toBeInTheDocument();
  });

  it("does not render pass or info validations", () => {
    render(<BlockersList blockers={[]} />);

    expect(
      screen.queryByText("VBR Version Compatibility"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("License/Edition Notes")).not.toBeInTheDocument();
  });

  it("renders blockers in the provided order", () => {
    render(<BlockersList blockers={[WARNING_RESULT, FAIL_RESULT]} />);

    const titles = screen.getAllByTestId("blocker-title");
    expect(titles[0]).toHaveTextContent("Agent Workload Configuration");
    expect(titles[1]).toHaveTextContent("Job Encryption Audit");
  });

  it("renders affected items as a list", () => {
    render(<BlockersList blockers={[FAIL_RESULT]} />);

    expect(screen.getByText("Job A")).toBeInTheDocument();
    expect(screen.getByText("Job B")).toBeInTheDocument();
    expect(screen.getByText("Job C")).toBeInTheDocument();
  });

  it("truncates affected items list after 5 items", () => {
    const manyItems: ValidationResult = {
      ...FAIL_RESULT,
      affectedItems: ["A", "B", "C", "D", "E", "F", "G"],
    };
    render(<BlockersList blockers={[manyItems]} />);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
    expect(screen.getByText(/and 2 more/i)).toBeInTheDocument();
  });

  it("uses shadcn Alert primitive with data-slot attribute", () => {
    render(<BlockersList blockers={[FAIL_RESULT, WARNING_RESULT]} />);

    const alerts = screen.getAllByRole("alert");
    for (const alert of alerts) {
      expect(alert).toHaveAttribute("data-slot", "alert");
    }
  });

  it("applies stagger animation delay to each blocker", () => {
    render(<BlockersList blockers={[FAIL_RESULT, WARNING_RESULT]} />);

    const alerts = screen.getAllByRole("alert");
    expect(alerts[0].style.animationDelay).toBe("0ms");
    expect(alerts[1].style.animationDelay).toBe("100ms");
  });

  it("renders nothing when all validations pass", () => {
    const { container } = render(<BlockersList blockers={[]} />);

    expect(
      container.querySelector("[data-testid='blockers-list']")?.children
        .length ?? 0,
    ).toBe(0);
  });

  describe("prefers-reduced-motion accessibility", () => {
    it("uses motion-safe prefix for alert animations", () => {
      render(<BlockersList blockers={[FAIL_RESULT]} />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toMatch(/motion-safe:animate-in/);
      expect(alert.className).toMatch(/motion-safe:fade-in/);
    });

    it("uses motion-safe prefix for attention-pulse animation", () => {
      render(<BlockersList blockers={[FAIL_RESULT]} />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toMatch(/motion-safe:animate-attention-pulse/);
    });
  });
});
