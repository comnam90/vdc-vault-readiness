import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { JobTable } from "@/components/dashboard/job-table";
import type { SafeJob } from "@/types/domain";

const MOCK_JOBS: SafeJob[] = [
  {
    JobName: "VM Backup Daily",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
  },
  {
    JobName: "SQL Agent Backup",
    JobType: "Agent Backup",
    Encrypted: false,
    RepoName: "WinLocal",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
  },
  {
    JobName: "File Backup Weekly",
    JobType: "File Backup",
    Encrypted: true,
    RepoName: "VeeamVault",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
  },
  {
    JobName: "Tape Job",
    JobType: "Tape Backup",
    Encrypted: false,
    RepoName: "DDBoost",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
  },
  {
    JobName: "Replica Job",
    JobType: "VMware Replica",
    Encrypted: true,
    RepoName: "LinuxHardened",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
  },
];

function createManyJobs(count: number): SafeJob[] {
  return Array.from({ length: count }, (_, i) => ({
    JobName: `Job ${String(i + 1).padStart(3, "0")}`,
    JobType: "VMware Backup",
    Encrypted: i % 2 === 0,
    RepoName: "Repo",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
  }));
}

describe("JobTable", () => {
  it("renders all job rows", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    expect(screen.getByText("VM Backup Daily")).toBeInTheDocument();
    expect(screen.getByText("SQL Agent Backup")).toBeInTheDocument();
    expect(screen.getByText("File Backup Weekly")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    expect(screen.getByText("Job Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Repository")).toBeInTheDocument();
    // "Encrypted" appears in both the column header and sr-only status labels
    expect(
      screen.getByRole("columnheader", { name: /encrypted/i }),
    ).toBeInTheDocument();
  });

  it("shows encrypted badges correctly", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    const yesBadges = screen.getAllByText("Yes");
    const noBadges = screen.getAllByText("No");

    expect(yesBadges.length).toBe(3);
    expect(noBadges.length).toBe(2);
  });

  it("filters jobs by name using search input", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    const searchInput = screen.getByPlaceholderText(/search jobs/i);
    fireEvent.change(searchInput, { target: { value: "SQL" } });

    expect(screen.getByText("SQL Agent Backup")).toBeInTheDocument();
    expect(screen.queryByText("VM Backup Daily")).not.toBeInTheDocument();
  });

  it("shows empty state when filter matches nothing", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    const searchInput = screen.getByPlaceholderText(/search jobs/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
  });

  it("paginates when more than 10 rows", () => {
    const manyJobs = createManyJobs(25);
    render(<JobTable jobs={manyJobs} />);

    // First page should show 10 rows
    expect(screen.getByText("Job 001")).toBeInTheDocument();
    expect(screen.getByText("Job 010")).toBeInTheDocument();
    expect(screen.queryByText("Job 011")).not.toBeInTheDocument();

    // Page info
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it("navigates to next page", () => {
    const manyJobs = createManyJobs(25);
    render(<JobTable jobs={manyJobs} />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    expect(screen.getByText("Job 011")).toBeInTheDocument();
    expect(screen.queryByText("Job 001")).not.toBeInTheDocument();
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
  });

  it("renders empty table for no jobs", () => {
    render(<JobTable jobs={[]} />);
    expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
  });

  it("provides accessible labels for status icons", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    const encryptedLabels = screen.getAllByText("Encrypted", {
      selector: ".sr-only",
    });
    const notEncryptedLabels = screen.getAllByText("Not encrypted", {
      selector: ".sr-only",
    });

    expect(encryptedLabels.length).toBe(3);
    expect(notEncryptedLabels.length).toBe(2);
  });

  it("has an accessible Status column header", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Status")).toHaveClass("sr-only");
  });

  it("applies entrance animation to table wrapper", () => {
    const { container } = render(<JobTable jobs={MOCK_JOBS} />);

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toMatch(/animate-in/);
    expect(wrapper!.className).toMatch(/fade-in/);
  });

  it("highlights unencrypted job rows with destructive background", () => {
    render(<JobTable jobs={MOCK_JOBS} />);

    // Find rows by job name, then check the parent row element
    const sqlAgentCell = screen.getByText("SQL Agent Backup");
    const sqlAgentRow = sqlAgentCell.closest("tr");
    expect(sqlAgentRow).toHaveClass("bg-destructive/5");

    const tapeJobCell = screen.getByText("Tape Job");
    const tapeJobRow = tapeJobCell.closest("tr");
    expect(tapeJobRow).toHaveClass("bg-destructive/5");

    // Encrypted rows should NOT have destructive background
    const vmBackupCell = screen.getByText("VM Backup Daily");
    const vmBackupRow = vmBackupCell.closest("tr");
    expect(vmBackupRow).not.toHaveClass("bg-destructive/5");
  });
});
