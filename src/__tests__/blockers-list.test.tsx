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

const PASS_RESULT: ValidationResult = {
  ruleId: "vbr-version",
  title: "VBR Version Compatibility",
  status: "pass",
  message: "All VBR servers meet the minimum version.",
  affectedItems: [],
};

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: ["Community"],
};

describe("BlockersList", () => {
  it("renders fail validations as destructive alerts", () => {
    render(<BlockersList validations={[FAIL_RESULT, PASS_RESULT]} />);

    expect(screen.getByText("Job Encryption Audit")).toBeInTheDocument();
    expect(
      screen.getByText("Vault requires source-side encryption."),
    ).toBeInTheDocument();
  });

  it("renders warning validations", () => {
    render(<BlockersList validations={[WARNING_RESULT, PASS_RESULT]} />);

    expect(
      screen.getByText("Agent Workload Configuration"),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent workloads detected.")).toBeInTheDocument();
  });

  it("does not render pass or info validations", () => {
    render(<BlockersList validations={[PASS_RESULT, INFO_RESULT]} />);

    expect(
      screen.queryByText("VBR Version Compatibility"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("License/Edition Notes")).not.toBeInTheDocument();
  });

  it("sorts fail items before warnings", () => {
    render(<BlockersList validations={[WARNING_RESULT, FAIL_RESULT]} />);

    const titles = screen.getAllByTestId("blocker-title");
    expect(titles[0]).toHaveTextContent("Job Encryption Audit");
    expect(titles[1]).toHaveTextContent("Agent Workload Configuration");
  });

  it("renders affected items as a list", () => {
    render(<BlockersList validations={[FAIL_RESULT]} />);

    expect(screen.getByText("Job A")).toBeInTheDocument();
    expect(screen.getByText("Job B")).toBeInTheDocument();
    expect(screen.getByText("Job C")).toBeInTheDocument();
  });

  it("truncates affected items list after 5 items", () => {
    const manyItems: ValidationResult = {
      ...FAIL_RESULT,
      affectedItems: ["A", "B", "C", "D", "E", "F", "G"],
    };
    render(<BlockersList validations={[manyItems]} />);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
    expect(screen.getByText(/and 2 more/i)).toBeInTheDocument();
  });

  it("uses shadcn Alert primitive with data-slot attribute", () => {
    render(<BlockersList validations={[FAIL_RESULT, WARNING_RESULT]} />);

    const alerts = screen.getAllByRole("alert");
    for (const alert of alerts) {
      expect(alert).toHaveAttribute("data-slot", "alert");
    }
  });

  it("applies stagger animation delay to each blocker", () => {
    render(<BlockersList validations={[FAIL_RESULT, WARNING_RESULT]} />);

    const alerts = screen.getAllByRole("alert");
    expect(alerts[0].style.animationDelay).toBe("0ms");
    expect(alerts[1].style.animationDelay).toBe("100ms");
  });

  it("renders nothing when all validations pass", () => {
    const { container } = render(<BlockersList validations={[PASS_RESULT]} />);

    expect(
      container.querySelector("[data-testid='blockers-list']")?.children
        .length ?? 0,
    ).toBe(0);
  });
});
