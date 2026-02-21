import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RepoDetailSheet } from "@/components/dashboard/repo-detail-sheet";
import type { SafeJob, SafeRepo } from "@/types/domain";
import type { RepoStats } from "@/lib/repo-aggregator";

function makeRepo(overrides: Partial<SafeRepo> = {}): SafeRepo {
  return {
    Name: "LinuxHardened",
    JobCount: 2,
    TotalSpaceTB: 5.0,
    FreeSpaceTB: 2.0,
    ImmutabilitySupported: true,
    Type: "LinuxHardened",
    Host: "backup-server-01",
    Path: "/mnt/backups",
    MaxTasks: 4,
    IsPerVmBackupFiles: true,
    IsDecompress: false,
    AlignBlocks: true,
    IsRotatedDrives: false,
    FreeSpacePercent: 40,
    ...overrides,
  };
}

function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "Job A",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    SourceSizeGB: 1024,
    OnDiskGB: 512,
    RetainDays: null,
    GfsDetails: null,
    RetentionScheme: null,
    CompressionLevel: null,
    BlockSize: null,
    GfsEnabled: null,
    ActiveFullEnabled: null,
    SyntheticFullEnabled: null,
    BackupChainType: null,
    IndexingEnabled: null,
    ...overrides,
  };
}

const MOCK_STATS: RepoStats = {
  sourceTB: 1.0,
  onDiskTB: 0.5,
};

describe("RepoDetailSheet — null repo", () => {
  it("renders closed sheet when repo is null", () => {
    render(
      <RepoDetailSheet
        repo={null}
        repoStats={null}
        jobs={[]}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("RepoDetailSheet — header", () => {
  it("shows repo name as sheet title", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ Name: "MyUniqueRepo", Type: "WinLocal" })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const titleEl = screen.getByText("MyUniqueRepo");
    expect(titleEl).toBeInTheDocument();
  });

  it("shows repo type as sheet description", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ Name: "AnotherRepo", Type: "WinLocal" })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const matches = screen.getAllByText("WinLocal");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows Immutable badge when ImmutabilitySupported is true", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ ImmutabilitySupported: true })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Immutable")).toBeInTheDocument();
  });

  it("shows Not Immutable badge when ImmutabilitySupported is false", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ ImmutabilitySupported: false })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Not Immutable")).toBeInTheDocument();
  });
});

describe("RepoDetailSheet — Identity section", () => {
  it("renders Identity section heading", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Identity")).toBeInTheDocument();
  });

  it("shows Type label and value", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ Type: "WinLocal" })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getAllByText("WinLocal").length).toBeGreaterThan(0);
  });

  it("shows Host label and value", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ Host: "srv-backup-01" })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("srv-backup-01")).toBeInTheDocument();
  });

  it("shows N/A for null Host", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ Host: null })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    // Multiple N/A values may appear (host, path, etc)
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  it("shows Path label and value", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ Path: "/data/backups" })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Path")).toBeInTheDocument();
    expect(screen.getByText("/data/backups")).toBeInTheDocument();
  });
});

describe("RepoDetailSheet — Capacity section", () => {
  it("renders Capacity section heading", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Capacity")).toBeInTheDocument();
  });

  it("shows Total Space formatted as TB", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ TotalSpaceTB: 5.0 })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("5.00 TB")).toBeInTheDocument();
  });

  it("shows free space with percent in green when >= 30%", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ FreeSpaceTB: 2.0, FreeSpacePercent: 40 })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const freeEl = screen.getByText("2.00 TB (40%)");
    expect(freeEl).toHaveClass("text-primary");
  });

  it("shows free space in amber when 15–29%", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ FreeSpaceTB: 1.0, FreeSpacePercent: 20 })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const freeEl = screen.getByText("1.00 TB (20%)");
    expect(freeEl).toHaveClass("text-warning");
  });

  it("shows free space in red when < 15%", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ FreeSpaceTB: 0.5, FreeSpacePercent: 10 })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const freeEl = screen.getByText("0.50 TB (10%)");
    expect(freeEl).toHaveClass("text-destructive");
  });

  it("shows source and backup data from repoStats", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={{ sourceTB: 1.0, onDiskTB: 0.5 }}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("1.00 TB")).toBeInTheDocument();
    expect(screen.getByText("0.50 TB")).toBeInTheDocument();
  });

  it("shows N/A for source and backup data when repoStats is null", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={null}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThanOrEqual(2);
  });
});

describe("RepoDetailSheet — Configuration section", () => {
  it("renders Configuration section heading", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Configuration")).toBeInTheDocument();
  });

  it("shows Max Tasks value", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ MaxTasks: 8 })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Max Tasks")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows BoolBadge for IsPerVmBackupFiles", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ IsPerVmBackupFiles: true })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Per-VM Files")).toBeInTheDocument();
  });

  it("shows BoolBadge for IsDecompress", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ IsDecompress: false })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Decompress")).toBeInTheDocument();
  });

  it("shows BoolBadge for AlignBlocks", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ AlignBlocks: true })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Align Blocks")).toBeInTheDocument();
  });

  it("shows BoolBadge for IsRotatedDrives", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ IsRotatedDrives: false })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Rotated Drives")).toBeInTheDocument();
  });

  it("shows Immutability with Supported/Not Supported labels", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo({ ImmutabilitySupported: true })}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Immutability")).toBeInTheDocument();
    expect(screen.getByText("Supported")).toBeInTheDocument();
  });
});

describe("RepoDetailSheet — Jobs section", () => {
  it("hides Jobs section when no jobs", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByText("Jobs")).not.toBeInTheDocument();
  });

  it("shows Jobs section when jobs present", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[makeJob()]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Jobs")).toBeInTheDocument();
  });

  it("shows job name", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[makeJob({ JobName: "My Backup Job" })]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("My Backup Job")).toBeInTheDocument();
  });

  it("shows encryption count label green when all encrypted", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[
          makeJob({ JobName: "Job 1", Encrypted: true }),
          makeJob({ JobName: "Job 2", Encrypted: true }),
        ]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const countEl = screen.getByText("2 / 2 jobs encrypted");
    expect(countEl).toHaveClass("text-primary");
  });

  it("shows encryption count label red when some unencrypted", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[
          makeJob({ JobName: "Job 1", Encrypted: true }),
          makeJob({ JobName: "Job 2", Encrypted: false }),
        ]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const countEl = screen.getByText("1 / 2 jobs encrypted");
    expect(countEl).toHaveClass("text-destructive");
  });

  it("shows Encrypted badge for encrypted job", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[makeJob({ Encrypted: true })]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Encrypted")).toBeInTheDocument();
  });

  it("shows Not Encrypted badge for unencrypted job", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[makeJob({ Encrypted: false })]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Not Encrypted")).toBeInTheDocument();
  });

  it("truncates job list at 10 and shows overflow count", () => {
    const manyJobs = Array.from({ length: 15 }, (_, i) =>
      makeJob({ JobName: `Job ${i + 1}` }),
    );
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={manyJobs}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Job 10")).toBeInTheDocument();
    expect(screen.queryByText("Job 11")).not.toBeInTheDocument();
    expect(screen.getByText("+ 5 more")).toBeInTheDocument();
  });

  it("does not show overflow label for 10 or fewer jobs", () => {
    const tenJobs = Array.from({ length: 10 }, (_, i) =>
      makeJob({ JobName: `Job ${i + 1}` }),
    );
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={tenJobs}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByText(/\+ \d+ more/)).not.toBeInTheDocument();
  });

  it("uses singular 'job' in count when exactly 1 job", () => {
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[makeJob({ Encrypted: true })]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("1 / 1 job encrypted")).toBeInTheDocument();
  });
});

describe("RepoDetailSheet — onOpenChange", () => {
  it("calls onOpenChange when sheet requests close", () => {
    const onOpenChange = vi.fn();
    render(
      <RepoDetailSheet
        repo={makeRepo()}
        repoStats={MOCK_STATS}
        jobs={[]}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );
    // Sheet renders a dialog with a close button
    const closeBtn = screen.getByRole("button", { name: /close/i });
    closeBtn.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
