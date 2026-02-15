import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { JobDetailSheet } from "@/components/dashboard/job-detail-sheet";
import type { EnrichedJob } from "@/types/enriched-job";

function createEnrichedJob(overrides: Partial<EnrichedJob> = {}): EnrichedJob {
  return {
    JobName: "Test Job",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    RetainDays: 30,
    GfsDetails: "Weekly:4, Monthly:12, Yearly:1",
    SourceSizeGB: 1024,
    OnDiskGB: 512,
    RetentionScheme: "Standard",
    CompressionLevel: "Optimal",
    BlockSize: "Local target (large blocks)",
    GfsEnabled: true,
    ActiveFullEnabled: false,
    SyntheticFullEnabled: true,
    BackupChainType: "Reverse Incremental",
    IndexingEnabled: true,
    sessionData: {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: 5.2,
      SuccessRate: 98.5,
      SessionCount: 200,
      Fails: 3,
      AvgJobTime: "00.01:15:30",
      MaxJobTime: "00.03:45:10",
    },
    ...overrides,
  };
}

const noop = () => {};

describe("JobDetailSheet", () => {
  it("renders job name as sheet title", () => {
    const job = createEnrichedJob({ JobName: "Daily VM Backup" });
    render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

    expect(
      screen.getByRole("heading", { name: "Daily VM Backup" }),
    ).toBeInTheDocument();
  });

  it("renders job type as description", () => {
    const job = createEnrichedJob({ JobType: "Agent Backup" });
    render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

    expect(screen.getByText("Agent Backup")).toBeInTheDocument();
  });

  it("renders encryption badge for encrypted job", () => {
    const job = createEnrichedJob({ Encrypted: true });
    render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

    const dialog = screen.getByRole("dialog");
    const encryptedBadge = dialog.querySelector(
      '[data-slot="badge"]',
    ) as HTMLElement;
    expect(encryptedBadge).not.toBeNull();
    expect(encryptedBadge.textContent).toMatch(/encrypted/i);
  });

  it("renders unencrypted badge for unencrypted job", () => {
    const job = createEnrichedJob({ Encrypted: false });
    render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

    const dialog = screen.getByRole("dialog");
    const badge = dialog.querySelector('[data-slot="badge"]') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toMatch(/not encrypted/i);
  });

  describe("Storage & Sizing section", () => {
    it("renders formatted source size", () => {
      const job = createEnrichedJob({ SourceSizeGB: 1536 });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Source Size")).toBeInTheDocument();
      expect(screen.getByText(/1\.50/)).toBeInTheDocument();
      expect(screen.getByText(/TB/)).toBeInTheDocument();
    });

    it("renders formatted on-disk size", () => {
      const job = createEnrichedJob({ OnDiskGB: 512 });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("On-Disk Size")).toBeInTheDocument();
      expect(screen.getByText("512 GB")).toBeInTheDocument();
    });

    it("renders compression ratio when both sizes available", () => {
      const job = createEnrichedJob({
        SourceSizeGB: 1024,
        OnDiskGB: 512,
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Compression Ratio")).toBeInTheDocument();
      expect(screen.getByText("2.0x")).toBeInTheDocument();
    });

    it("renders muted N/A compression ratio when sizes missing", () => {
      const job = createEnrichedJob({
        SourceSizeGB: null,
        OnDiskGB: null,
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const row = screen.getByText("Compression Ratio").closest("div");
      expect(row).not.toBeNull();
      const value = within(row as HTMLElement).getByText("N/A");
      expect(value).toHaveClass("text-muted-foreground");
    });

    it("renders change rate from session data", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 5.2,
          SuccessRate: null,
          SessionCount: null,
          Fails: null,
          AvgJobTime: null,
          MaxJobTime: null,
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Change Rate")).toBeInTheDocument();
      expect(screen.getByText("5.2%")).toBeInTheDocument();
    });

    it("color-codes high change rate with warning token", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 15.5,
          SuccessRate: null,
          SessionCount: null,
          Fails: null,
          AvgJobTime: null,
          MaxJobTime: null,
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const rateElement = screen.getByText("15.5%");
      expect(rateElement.className).toMatch(/text-warning/);
    });

    it("color-codes very high change rate in destructive", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 55.0,
          SuccessRate: null,
          SessionCount: null,
          Fails: null,
          AvgJobTime: null,
          MaxJobTime: null,
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const rateElement = screen.getByText("55.0%");
      expect(rateElement.className).toMatch(/text-destructive/);
    });
  });

  describe("Protection Policy section", () => {
    it("renders retention days with scheme", () => {
      const job = createEnrichedJob({
        RetainDays: 30,
        RetentionScheme: "Standard",
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Retention")).toBeInTheDocument();
      expect(screen.getByText(/30 days/)).toBeInTheDocument();
      expect(screen.getByText(/Standard/)).toBeInTheDocument();
    });

    it("renders backup chain type", () => {
      const job = createEnrichedJob({
        BackupChainType: "Reverse Incremental",
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Backup Chain")).toBeInTheDocument();
      expect(screen.getByText("Reverse Incremental")).toBeInTheDocument();
    });

    it("renders active full and synthetic full status", () => {
      const job = createEnrichedJob({
        ActiveFullEnabled: true,
        SyntheticFullEnabled: false,
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Active Full")).toBeInTheDocument();
      expect(screen.getByText("Synthetic Full")).toBeInTheDocument();
    });

    it("renders GFS breakdown when enabled", () => {
      const job = createEnrichedJob({
        GfsEnabled: true,
        GfsDetails: "Weekly:4, Monthly:12, Yearly:1",
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("GFS Policy")).toBeInTheDocument();
      expect(screen.getByText(/Weekly: 4/)).toBeInTheDocument();
      expect(screen.getByText(/Monthly: 12/)).toBeInTheDocument();
      expect(screen.getByText(/Yearly: 1/)).toBeInTheDocument();
    });

    it("renders 'None configured' when GFS not enabled", () => {
      const job = createEnrichedJob({
        GfsEnabled: false,
        GfsDetails: null,
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("GFS Policy")).toBeInTheDocument();
      expect(screen.getByText("None configured")).toBeInTheDocument();
    });

    it("renders muted N/A when GFS state is unknown", () => {
      const job = createEnrichedJob({
        GfsEnabled: null,
        GfsDetails: null,
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const row = screen.getByText("GFS Policy").closest("div");
      expect(row).not.toBeNull();
      const value = within(row as HTMLElement).getByText("N/A");
      expect(value).toHaveClass("text-muted-foreground");
    });
  });

  describe("Configuration section", () => {
    it("renders repository", () => {
      const job = createEnrichedJob({ RepoName: "LinuxHardened" });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Repository")).toBeInTheDocument();
      expect(screen.getByText("LinuxHardened")).toBeInTheDocument();
    });

    it("renders compression level", () => {
      const job = createEnrichedJob({ CompressionLevel: "Optimal" });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Compression")).toBeInTheDocument();
      expect(screen.getByText("Optimal")).toBeInTheDocument();
    });

    it("renders block size", () => {
      const job = createEnrichedJob({
        BlockSize: "Local target (large blocks)",
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Block Size")).toBeInTheDocument();
      expect(
        screen.getByText("Local target (large blocks)"),
      ).toBeInTheDocument();
    });

    it("renders indexing status", () => {
      const job = createEnrichedJob({ IndexingEnabled: true });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Indexing")).toBeInTheDocument();
    });
  });

  describe("Session Performance section", () => {
    it("renders success rate with green color for high rate", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 5.2,
          SuccessRate: 98.5,
          SessionCount: 200,
          Fails: 3,
          AvgJobTime: "00.01:15:30",
          MaxJobTime: "00.03:45:10",
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Success Rate")).toBeInTheDocument();
      expect(screen.getByText("98.5%")).toBeInTheDocument();
    });

    it("renders warning token success rate for moderate rate", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 5.2,
          SuccessRate: 85.0,
          SessionCount: 200,
          Fails: 30,
          AvgJobTime: "00.01:15:30",
          MaxJobTime: "00.03:45:10",
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const rateEl = screen.getByText("85.0%");
      expect(rateEl.className).toMatch(/text-warning/);
    });

    it("renders red success rate for low rate", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 5.2,
          SuccessRate: 75.0,
          SessionCount: 200,
          Fails: 50,
          AvgJobTime: "00.01:15:30",
          MaxJobTime: "00.03:45:10",
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const rateEl = screen.getByText("75.0%");
      expect(rateEl.className).toMatch(/text-destructive/);
    });

    it("renders session count and fail count", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 5.2,
          SuccessRate: 98.5,
          SessionCount: 200,
          Fails: 3,
          AvgJobTime: "00.01:15:30",
          MaxJobTime: "00.03:45:10",
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Sessions")).toBeInTheDocument();
      expect(screen.getByText(/200/)).toBeInTheDocument();
      expect(screen.getByText("Failures")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders formatted avg and max job time", () => {
      const job = createEnrichedJob({
        sessionData: {
          JobName: "Test Job",
          MaxDataSize: null,
          AvgChangeRate: 5.2,
          SuccessRate: 98.5,
          SessionCount: 200,
          Fails: 3,
          AvgJobTime: "00.01:15:30",
          MaxJobTime: "00.03:45:10",
        },
      });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Avg Duration")).toBeInTheDocument();
      expect(screen.getByText("1h 15m")).toBeInTheDocument();
      expect(screen.getByText("Max Duration")).toBeInTheDocument();
      expect(screen.getByText("3h 45m")).toBeInTheDocument();
    });

    it("renders N/A for null session data", () => {
      const job = createEnrichedJob({ sessionData: null });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      expect(screen.getByText("Success Rate")).toBeInTheDocument();
      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders muted N/A for duration rows when session data is missing", () => {
      const job = createEnrichedJob({ sessionData: null });
      render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

      const avgRow = screen.getByText("Avg Duration").closest("div");
      expect(avgRow).not.toBeNull();
      const avgValue = within(avgRow as HTMLElement).getByText("N/A");
      expect(avgValue).toHaveClass("text-muted-foreground");

      const maxRow = screen.getByText("Max Duration").closest("div");
      expect(maxRow).not.toBeNull();
      const maxValue = within(maxRow as HTMLElement).getByText("N/A");
      expect(maxValue).toHaveClass("text-muted-foreground");
    });
  });

  it("uses motion-safe prefix on sheet animations", () => {
    const job = createEnrichedJob();
    render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/motion-safe:.*animate/);
  });

  it("does not render dialog when open is false", () => {
    const job = createEnrichedJob();
    render(<JobDetailSheet job={job} open={false} onOpenChange={noop} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render dialog when job is null", () => {
    render(<JobDetailSheet job={null} open={true} onOpenChange={noop} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange when closed", () => {
    let openState = true;
    const handleOpenChange = (open: boolean) => {
      openState = open;
    };

    const job = createEnrichedJob();
    const { rerender } = render(
      <JobDetailSheet job={job} open={true} onOpenChange={handleOpenChange} />,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    closeButton.click();

    expect(openState).toBe(false);

    rerender(
      <JobDetailSheet job={job} open={false} onOpenChange={handleOpenChange} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
