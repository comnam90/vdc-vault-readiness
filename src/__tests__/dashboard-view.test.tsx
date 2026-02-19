import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { NormalizedDataset } from "@/types/domain";
import { MOCK_DATA, ALL_PASS_VALIDATIONS, MIXED_VALIDATIONS } from "./fixtures";
import { getBlockerCount } from "@/lib/validation-selectors";

// Multiple servers: first passes (13.0.1), second fails (11.0.0)
const MULTI_SERVER_MIXED_DATA: NormalizedDataset = {
  backupServer: [
    { Version: "13.0.1.1071", Name: "VBR-Primary" },
    { Version: "11.0.0.100", Name: "VBR-Secondary" },
  ],
  securitySummary: [
    { BackupFileEncryptionEnabled: true, ConfigBackupEncryptionEnabled: true },
  ],
  jobInfo: [],
  Licenses: [{ Edition: "Enterprise Plus", Status: "Active" }],
  jobSessionSummary: [],
  sobr: [],
  capExtents: [],
  archExtents: [],
  dataErrors: [],
};

// Multiple servers: all pass minimum version
const MULTI_SERVER_ALL_PASS_DATA: NormalizedDataset = {
  backupServer: [
    { Version: "13.0.1.1071", Name: "VBR-Primary" },
    { Version: "12.2.0.500", Name: "VBR-Secondary" },
  ],
  securitySummary: [
    { BackupFileEncryptionEnabled: true, ConfigBackupEncryptionEnabled: true },
  ],
  jobInfo: [],
  Licenses: [{ Edition: "Enterprise Plus", Status: "Active" }],
  jobSessionSummary: [],
  sobr: [],
  capExtents: [],
  archExtents: [],
  dataErrors: [],
};

describe("DashboardView", () => {
  it("renders the header with title and Upload New button", () => {
    const onReset = vi.fn();
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={onReset}
      />,
    );

    expect(screen.getByText("VDC Vault Readiness")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload new/i }),
    ).toBeInTheDocument();
  });

  it("calls onReset when Upload New button is clicked", () => {
    const onReset = vi.fn();
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /upload new/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("renders summary cards with VBR version", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("13.0.1.1071")).toBeInTheDocument();
  });

  it("renders total jobs count in summary card", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows Fail readiness when any validation fails", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Action Required")).toBeInTheDocument();
  });

  it("shows Pass readiness when all validations pass", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={ALL_PASS_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders Overview and Job Details tabs", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /job details/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sizing/i })).toBeInTheDocument();
  });

  it("shows CalculatorInputs when Sizing tab is clicked", async () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const sizingTab = screen.getByRole("tab", { name: /sizing/i });

    await act(async () => {
      fireEvent.mouseDown(sizingTab);
      fireEvent.click(sizingTab);
    });

    expect(await screen.findByText("Calculator Inputs")).toBeInTheDocument();
  });

  it("shows blockers in the overview tab by default", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    // Blockers should be visible on the overview tab (default)
    expect(screen.getByText("Job Encryption Audit")).toBeInTheDocument();
  });

  it("shows Scan Complete badge in the header", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Scan Complete")).toBeInTheDocument();
  });

  it("staggers summary cards with 100ms delay per §5.2 spec", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const cards = container.querySelectorAll("[data-slot='card']");
    expect(cards.length).toBe(3);
    // First card: no delay, second: delay-100, third: delay-200
    expect(cards[0].className).not.toMatch(/delay-/);
    expect(cards[1].className).toMatch(/delay-100/);
    expect(cards[2].className).toMatch(/delay-200/);
  });

  it("TabsList stretches to full container width for visual stability", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );
    const tabsList = container.querySelector("[data-slot='tabs-list']");
    expect(tabsList?.className).toMatch(/\bw-full\b/);
  });

  it("outer wrapper declares w-full for stable cross-tab width", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toMatch(/\bw-full\b/);
  });

  it("uses stronger summary card borders and status tints", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const cards = container.querySelectorAll("[data-slot='card']");
    expect(cards[0].className).toMatch(/border-b-4/);
    expect(cards[0].className).toMatch(/bg-card-tint-success/);
    expect(cards[1].className).toMatch(/bg-card-tint-neutral/);
    expect(cards[2].className).toMatch(/bg-card-tint-destructive/);
    expect(cards[2].className).not.toMatch(/ring-2/);
  });

  it("shows readiness ring glow only when all checks pass", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={ALL_PASS_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const cards = container.querySelectorAll("[data-slot='card']");
    expect(cards[2].className).toMatch(/ring-2/);
    expect(cards[2].className).toMatch(/ring-primary\/20/);
  });

  it("uses 400ms duration and 8px rise for entrance animation per §4", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toMatch(/duration-400/);
    expect(mainContainer.className).toMatch(/slide-in-from-bottom-2/);
    expect(mainContainer.className).not.toMatch(/slide-in-from-bottom-4/);
  });

  it("shows all checks passed celebration message when no blockers", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={ALL_PASS_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("All Systems Ready")).toBeInTheDocument();
  });

  it("shows compatibility message when all checks pass", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={ALL_PASS_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/fully compatible with VDC Vault/i),
    ).toBeInTheDocument();
  });

  it("shows passing checks below blockers when there are mixed results", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    // Blockers should be present
    expect(screen.getByTestId("blockers-list")).toBeInTheDocument();
    // Passing checks should also be present
    expect(screen.getByTestId("passing-checks")).toBeInTheDocument();
    expect(screen.getByText("VBR Version Compatibility")).toBeInTheDocument();
  });

  it("renders passing checks section after blockers section in DOM order", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const blockersList = container.querySelector(
      "[data-testid='blockers-list']",
    );
    const passingChecks = container.querySelector(
      "[data-testid='passing-checks']",
    );
    expect(blockersList).toBeInTheDocument();
    expect(passingChecks).toBeInTheDocument();

    // Passing checks should come after blockers in DOM order
    const result = blockersList!.compareDocumentPosition(passingChecks!);
    expect(result & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses blocker count from selectors for passing checks delay", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const alerts = container
      .querySelector("[data-testid='passing-checks']")
      ?.querySelectorAll<HTMLElement>("[data-slot='alert']");

    const blockerCount = getBlockerCount(MIXED_VALIDATIONS);
    expect(alerts?.[0].style.animationDelay).toBe(`${blockerCount * 100}ms`);
  });

  it("does not show passing checks section when all checks pass (celebration shown instead)", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={ALL_PASS_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("All Systems Ready")).toBeInTheDocument();
    expect(screen.queryByTestId("passing-checks")).not.toBeInTheDocument();
  });

  it("renders Repositories tab trigger", () => {
    render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={() => {}}
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Repositories" }),
    ).toBeInTheDocument();
  });

  describe("multiple backup servers", () => {
    it("displays oldest version when multiple servers have mixed versions", () => {
      render(
        <DashboardView
          data={MULTI_SERVER_MIXED_DATA}
          validations={ALL_PASS_VALIDATIONS}
          onReset={vi.fn()}
        />,
      );

      expect(screen.getByText("11.0.0.100")).toBeInTheDocument();
    });

    it("shows version as failing when any server fails minimum version check", () => {
      render(
        <DashboardView
          data={MULTI_SERVER_MIXED_DATA}
          validations={ALL_PASS_VALIDATIONS}
          onReset={vi.fn()}
        />,
      );

      const versionCard = screen.getByText("11.0.0.100");
      expect(versionCard).toHaveClass("text-destructive");
    });

    it("shows version as passing when all servers meet minimum requirement", () => {
      render(
        <DashboardView
          data={MULTI_SERVER_ALL_PASS_DATA}
          validations={ALL_PASS_VALIDATIONS}
          onReset={vi.fn()}
        />,
      );

      expect(screen.getByText("12.2.0.500")).toBeInTheDocument();
      const versionCard = screen.getByText("12.2.0.500");
      expect(versionCard).toHaveClass("text-primary");
    });
  });
});
