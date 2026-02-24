import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CalculatorConsentDialog } from "@/components/dashboard/calculator-consent-dialog";
import type { CalculatorSummary } from "@/types/calculator";

const defaultSummary: CalculatorSummary = {
  totalSourceDataTB: 10.5,
  weightedAvgChangeRate: 5.2,
  immutabilityDays: 30,
  maxRetentionDays: 30,
  originalMaxRetentionDays: 14,
  gfsWeekly: 4,
  gfsMonthly: 12,
  gfsYearly: 7,
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onAccept: vi.fn(),
  onDecline: vi.fn(),
  summary: defaultSummary,
  activeJobCount: 5,
  vbrVersion: "13.0.1.1071",
};

describe("CalculatorConsentDialog", () => {
  it("does not render content when open=false", () => {
    render(<CalculatorConsentDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders non-scary title mentioning external service", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    expect(
      screen.getByText(/sizing calculation uses external service/i),
    ).toBeInTheDocument();
  });

  it("renders Decline button and Accept & Calculate button", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /decline/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /accept & calculate/i }),
    ).toBeInTheDocument();
  });

  it("expandable section is closed by default", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    const trigger = screen.getByRole("button", {
      name: /view data being sent/i,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking 'View data being sent' toggle opens the expandable", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    const trigger = screen.getByRole("button", {
      name: /view data being sent/i,
    });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("shows environment data after expanding: source data, change rate, retention, GFS, job count", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /view data being sent/i }),
    );

    expect(screen.getByText("Source Data Size")).toBeInTheDocument();
    expect(screen.getByText("10.50 TB")).toBeInTheDocument();

    expect(screen.getByText("Daily Change Rate")).toBeInTheDocument();
    expect(screen.getByText("5.20%")).toBeInTheDocument();

    expect(screen.getByText("Retention Period")).toBeInTheDocument();
    expect(screen.getAllByText("30 days").length).toBeGreaterThan(0);

    expect(screen.getByText("Extended Retention (GFS)")).toBeInTheDocument();
    expect(
      screen.getByText("Weekly: 4, Monthly: 12, Yearly: 7"),
    ).toBeInTheDocument();

    expect(screen.getByText("Job Count")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 'None configured' for GFS when all three are null", () => {
    const summaryNoGfs: CalculatorSummary = {
      ...defaultSummary,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    render(
      <CalculatorConsentDialog {...defaultProps} summary={summaryNoGfs} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /view data being sent/i }),
    );
    expect(screen.getByText("None configured")).toBeInTheDocument();
  });

  it("shows fixed calculator assumptions section after expansion", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /view data being sent/i }),
    );

    expect(
      screen.getByText("Fixed calculator assumptions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Backup Window")).toBeInTheDocument();
    expect(screen.getByText("8 hours")).toBeInTheDocument();
    expect(screen.getByText("Data Reduction")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("calls onAccept and NOT onDecline when Accept is clicked", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CalculatorConsentDialog
        {...defaultProps}
        onAccept={onAccept}
        onDecline={onDecline}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /accept & calculate/i }),
    );
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("calls onDecline and NOT onAccept when Decline is clicked", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CalculatorConsentDialog
        {...defaultProps}
        onAccept={onAccept}
        onDecline={onDecline}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("collapsible trigger has aria-expanded attribute", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    const trigger = screen.getByRole("button", {
      name: /view data being sent/i,
    });
    expect(trigger).toHaveAttribute("aria-expanded");
  });

  it("renders role=dialog when open", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("DialogContent has motion-safe: prefixed animation classes", () => {
    render(<CalculatorConsentDialog {...defaultProps} />);
    const dialogContent = screen.getByRole("dialog");
    expect(dialogContent.className).toMatch(/motion-safe:/);
  });
});
