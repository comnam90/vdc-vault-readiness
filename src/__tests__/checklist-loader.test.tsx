import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChecklistLoader } from "@/components/dashboard/checklist-loader";
import { PIPELINE_STEPS } from "@/lib/constants";

describe("ChecklistLoader", () => {
  it("renders all pipeline step labels in the checklist", () => {
    render(<ChecklistLoader completedSteps={[]} currentStep="parse" />);

    const list = screen.getByRole("list", { name: /validation steps/i });
    for (const step of PIPELINE_STEPS) {
      expect(within(list).getByText(step.label)).toBeInTheDocument();
    }
  });

  it("displays progress bar at 0% when no steps completed", () => {
    render(<ChecklistLoader completedSteps={[]} currentStep="parse" />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("displays correct progress percentage", () => {
    const completed = ["parse", "vbr-version"];
    render(
      <ChecklistLoader completedSteps={completed} currentStep="encryption" />,
    );

    const progressBar = screen.getByRole("progressbar");
    const expected = Math.round((2 / PIPELINE_STEPS.length) * 100);
    expect(progressBar).toHaveAttribute("aria-valuenow", String(expected));
    expect(screen.getByText(`${expected}%`)).toBeInTheDocument();
  });

  it("shows current step label as header text", () => {
    render(
      <ChecklistLoader completedSteps={["parse"]} currentStep="vbr-version" />,
    );

    expect(screen.getByText("Validate VBR version...")).toBeInTheDocument();
  });

  it("shows 'Finalizing...' when no current step", () => {
    const allStepIds = PIPELINE_STEPS.map((s) => s.id);
    render(<ChecklistLoader completedSteps={allStepIds} currentStep={null} />);

    expect(screen.getByText("Finalizing...")).toBeInTheDocument();
  });

  it("renders accessible validation steps list", () => {
    render(<ChecklistLoader completedSteps={[]} currentStep="parse" />);

    expect(
      screen.getByRole("list", { name: /validation steps/i }),
    ).toBeInTheDocument();
  });

  it("has a testid for integration testing", () => {
    render(<ChecklistLoader completedSteps={[]} currentStep="parse" />);
    expect(screen.getByTestId("checklist-loader")).toBeInTheDocument();
  });

  it("applies entrance animation to container", () => {
    render(<ChecklistLoader completedSteps={[]} currentStep="parse" />);

    const container = screen.getByTestId("checklist-loader");
    expect(container.className).toMatch(/animate-in/);
    expect(container.className).toMatch(/fade-in/);
  });
});
