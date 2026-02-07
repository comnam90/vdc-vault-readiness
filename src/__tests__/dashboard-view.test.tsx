import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { NormalizedDataset } from "@/types/domain";
import { MOCK_DATA, ALL_PASS_VALIDATIONS, MIXED_VALIDATIONS } from "./fixtures";

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

  it("staggers summary cards with 50ms delay per spec", () => {
    const { container } = render(
      <DashboardView
        data={MOCK_DATA}
        validations={MIXED_VALIDATIONS}
        onReset={vi.fn()}
      />,
    );

    const cards = container.querySelectorAll("[data-slot='card']");
    expect(cards.length).toBe(3);
    // First card: no delay, second: delay-50, third: delay-100
    expect(cards[0].className).not.toMatch(/delay-/);
    expect(cards[1].className).toMatch(/delay-50/);
    expect(cards[2].className).toMatch(/delay-100/);
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
