import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PassingChecksList } from "@/components/dashboard/passing-checks-list";
import type { ValidationResult } from "@/types/validation";
import { getBlockerCount } from "@/lib/validation-selectors";

const PASS_VBR: ValidationResult = {
  ruleId: "vbr-version",
  title: "VBR Version Compatibility",
  status: "pass",
  message: "All VBR servers meet the minimum version.",
  affectedItems: [],
};

const PASS_ENCRYPTION: ValidationResult = {
  ruleId: "job-encryption",
  title: "Job Encryption Audit",
  status: "pass",
  message: "All jobs are encrypted.",
  affectedItems: [],
};

const FAIL_RESULT: ValidationResult = {
  ruleId: "aws-workload",
  title: "AWS Workload Support",
  status: "fail",
  message: "AWS workloads detected.",
  affectedItems: ["AWS Backup Job"],
};

const WARNING_RESULT: ValidationResult = {
  ruleId: "agent-workload",
  title: "Agent Workload Configuration",
  status: "warning",
  message: "Agent workloads detected.",
  affectedItems: ["Agent Job 1"],
};

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: ["Community"],
};

describe("PassingChecksList", () => {
  it("renders only pass validations", () => {
    render(
      <PassingChecksList
        validations={[PASS_VBR, FAIL_RESULT, WARNING_RESULT, INFO_RESULT]}
      />,
    );

    expect(screen.getByText("VBR Version Compatibility")).toBeInTheDocument();
    expect(screen.queryByText("AWS Workload Support")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Agent Workload Configuration"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("License/Edition Notes")).not.toBeInTheDocument();
  });

  it("renders multiple passing checks", () => {
    render(<PassingChecksList validations={[PASS_VBR, PASS_ENCRYPTION]} />);

    expect(screen.getByText("VBR Version Compatibility")).toBeInTheDocument();
    expect(screen.getByText("Job Encryption Audit")).toBeInTheDocument();
  });

  it("displays the pass message for each check", () => {
    render(<PassingChecksList validations={[PASS_VBR]} />);

    expect(
      screen.getByText("All VBR servers meet the minimum version."),
    ).toBeInTheDocument();
  });

  it("shows a Passed badge for each check", () => {
    render(<PassingChecksList validations={[PASS_VBR]} />);

    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("renders nothing when there are no passing validations", () => {
    const { container } = render(
      <PassingChecksList validations={[FAIL_RESULT, WARNING_RESULT]} />,
    );

    expect(
      container.querySelector("[data-testid='passing-checks']"),
    ).toBeNull();
  });

  it("shows a section heading with the count of passing checks", () => {
    render(
      <PassingChecksList
        validations={[PASS_VBR, PASS_ENCRYPTION, FAIL_RESULT]}
      />,
    );

    expect(screen.getByText(/2 checks passed/i)).toBeInTheDocument();
  });

  it("uses celebrate-in animation classes on passing checks heading and icon", () => {
    render(<PassingChecksList validations={[PASS_VBR, PASS_ENCRYPTION]} />);

    const heading = screen.getByText(/2 checks passed/i);
    expect(heading).toHaveClass("motion-safe:animate-celebrate-in");
    expect(heading).toHaveClass("text-primary");

    const icon = screen.getByTestId("passing-checks").querySelector("svg");
    expect(icon).toHaveClass("motion-safe:animate-celebrate-in");
    expect(icon).toHaveClass("text-primary");
  });

  it("applies stagger animation delay to each passing check", () => {
    render(<PassingChecksList validations={[PASS_VBR, PASS_ENCRYPTION]} />);

    const items = screen
      .getByTestId("passing-checks")
      .querySelectorAll<HTMLElement>("[data-slot='alert']");
    expect(items[0].style.animationDelay).toBe("0ms");
    expect(items[1].style.animationDelay).toBe("100ms");
  });

  it("offsets stagger delay when blockerCount is provided", () => {
    render(
      <PassingChecksList
        validations={[PASS_VBR, PASS_ENCRYPTION]}
        blockerCount={getBlockerCount([
          FAIL_RESULT,
          WARNING_RESULT,
          INFO_RESULT,
        ])}
      />,
    );

    const items = screen
      .getByTestId("passing-checks")
      .querySelectorAll<HTMLElement>("[data-slot='alert']");
    expect(items[0].style.animationDelay).toBe("200ms");
    expect(items[1].style.animationDelay).toBe("300ms");
  });

  it("uses the CheckCircle2 icon with primary color styling", () => {
    render(<PassingChecksList validations={[PASS_VBR]} />);

    const svg = screen.getByTestId("passing-checks").querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("text-primary");
  });
});
