import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { JobTable } from "@/components/dashboard/job-table";
import type { EnrichedJob } from "@/types/enriched-job";

function createEnrichedJob(overrides: Partial<EnrichedJob> = {}): EnrichedJob {
  return {
    JobName: "Test Job",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    RetainDays: null,
    GfsDetails: null,
    SourceSizeGB: null,
    OnDiskGB: null,
    RetentionScheme: null,
    CompressionLevel: null,
    BlockSize: null,
    GfsEnabled: null,
    ActiveFullEnabled: null,
    SyntheticFullEnabled: null,
    BackupChainType: null,
    IndexingEnabled: null,
    sessionData: null,
    ...overrides,
  };
}

const MOCK_JOBS: EnrichedJob[] = [
  createEnrichedJob({
    JobName: "VM Backup Daily",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
    SourceSizeGB: 1536,
    GfsEnabled: true,
    sessionData: {
      JobName: "VM Backup Daily",
      MaxDataSize: null,
      AvgChangeRate: 5.2,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    },
  }),
  createEnrichedJob({
    JobName: "SQL Agent Backup",
    JobType: "Agent Backup",
    Encrypted: false,
    RepoName: "WinLocal",
    SourceSizeGB: 500,
    GfsEnabled: false,
    sessionData: {
      JobName: "SQL Agent Backup",
      MaxDataSize: null,
      AvgChangeRate: 15.5,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    },
  }),
  createEnrichedJob({
    JobName: "File Backup Weekly",
    JobType: "File Backup",
    Encrypted: true,
    RepoName: "VeeamVault",
    SourceSizeGB: null,
    GfsEnabled: null,
    sessionData: null,
  }),
  createEnrichedJob({
    JobName: "Tape Job",
    JobType: "Tape Backup",
    Encrypted: false,
    RepoName: "DDBoost",
    SourceSizeGB: 200,
    GfsEnabled: false,
    sessionData: {
      JobName: "Tape Job",
      MaxDataSize: null,
      AvgChangeRate: 55.0,
      SuccessRate: null,
      SessionCount: null,
      Fails: null,
      AvgJobTime: null,
      MaxJobTime: null,
    },
  }),
  createEnrichedJob({
    JobName: "Replica Job",
    JobType: "VMware Replica",
    Encrypted: true,
    RepoName: "LinuxHardened",
  }),
];

function createManyJobs(count: number): EnrichedJob[] {
  return Array.from({ length: count }, (_, i) =>
    createEnrichedJob({
      JobName: `Job ${String(i + 1).padStart(3, "0")}`,
      Encrypted: i % 2 === 0,
      RepoName: "Repo",
    }),
  );
}

function getJobNamesInOrder() {
  const table = screen.getByRole("table");
  return Array.from(table.querySelectorAll("tbody tr")).map((row) => {
    const cells = row.querySelectorAll("td");
    return cells[1] ? (cells[1].textContent?.trim() ?? "") : "";
  });
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

    // "Yes" appears in encrypted column AND GFS column
    // Encrypted: 3 Yes + GFS: 1 Yes = 4 total "Yes"
    // Encrypted: 2 No + GFS: 4 No (false×2 + null×2) = 6 total "No"
    const yesBadges = screen.getAllByText("Yes");
    const noBadges = screen.getAllByText("No");

    expect(yesBadges.length).toBe(4);
    expect(noBadges.length).toBe(6);
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

  describe("smart columns", () => {
    it("renders Source Size column header", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      expect(screen.getByText("Source Size")).toBeInTheDocument();
    });

    it("renders formatted source size in TB for large values", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      // VM Backup Daily has 1536 GB → 1.50 TB
      expect(screen.getByText("1.50")).toBeInTheDocument();
      expect(screen.getByText("TB")).toBeInTheDocument();
    });

    it("renders formatted source size in GB for smaller values", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      // SQL Agent Backup has 500 GB
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("renders N/A for null source size", () => {
      const jobs = [createEnrichedJob({ JobName: "Null Size Job" })];
      render(<JobTable jobs={jobs} />);

      // Should show N/A in both Source Size and Change Rate columns
      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });

    it("right-aligns source size column", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const header = screen.getByRole("columnheader", {
        name: /source size/i,
      });
      expect(header.className).toMatch(/text-right/);
    });

    it("uses font-mono for source size values", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      // The "1.50" text should be inside a font-mono element
      const sizeValue = screen.getByText("1.50");
      const monoParent = sizeValue.closest(".font-mono");
      expect(monoParent).not.toBeNull();
    });

    it("renders Change Rate column header", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      expect(screen.getByText("Change Rate")).toBeInTheDocument();
    });

    it("renders formatted change rate from session data", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      // VM Backup Daily has 5.2% change rate
      expect(screen.getByText("5.2%")).toBeInTheDocument();
    });

    it("renders N/A for null change rate", () => {
      const jobs = [
        createEnrichedJob({
          JobName: "No Session Job",
          sessionData: null,
        }),
      ];
      render(<JobTable jobs={jobs} />);

      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });

    it("applies warning token color for change rate >10%", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      // SQL Agent Backup has 15.5% change rate
      const rateElement = screen.getByText("15.5%");
      expect(rateElement.className).toMatch(/text-warning/);
    });

    it("applies destructive color for change rate >50%", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      // Tape Job has 55.0% change rate
      const rateElement = screen.getByText("55.0%");
      expect(rateElement.className).toMatch(/text-destructive/);
    });

    it("right-aligns change rate column", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const header = screen.getByRole("columnheader", {
        name: /change rate/i,
      });
      expect(header.className).toMatch(/text-right/);
    });

    it("renders GFS column header", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      expect(screen.getByText("GFS")).toBeInTheDocument();
    });

    it("renders GFS Yes badge when enabled", () => {
      const jobs = [
        createEnrichedJob({
          JobName: "GFS Job",
          GfsEnabled: true,
        }),
      ];
      render(<JobTable jobs={jobs} />);

      const jobRow = screen.getByText("GFS Job").closest("tr")!;
      const cells = jobRow.querySelectorAll("td");
      const gfsCellTexts = Array.from(cells).map((c) => c.textContent);
      expect(gfsCellTexts).toContain("Yes");
    });

    it("renders GFS No badge when disabled", () => {
      const jobs = [
        createEnrichedJob({
          JobName: "No GFS Job",
          GfsEnabled: false,
        }),
      ];
      render(<JobTable jobs={jobs} />);

      const jobRow = screen.getByText("No GFS Job").closest("tr")!;
      const cells = jobRow.querySelectorAll("td");
      const gfsCellTexts = Array.from(cells).map((c) => c.textContent);
      expect(
        gfsCellTexts.filter((t) => t === "No").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe("row click interaction", () => {
    it("rows have role button and tabIndex 0", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const vmBackupCell = screen.getByText("VM Backup Daily");
      const row = vmBackupCell.closest("tr");
      expect(row).toHaveAttribute("role", "button");
      expect(row).toHaveAttribute("tabindex", "0");
    });

    it("clicking a row opens the detail sheet", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const vmBackupCell = screen.getByText("VM Backup Daily");
      const row = vmBackupCell.closest("tr")!;
      fireEvent.click(row);

      // Sheet should open as a dialog with the job name as title
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "VM Backup Daily" }),
      ).toBeInTheDocument();
    });

    it("pressing Enter on a row opens the detail sheet", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const vmBackupCell = screen.getByText("VM Backup Daily");
      const row = vmBackupCell.closest("tr")!;
      fireEvent.keyDown(row, { key: "Enter" });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("pressing Space on a row opens the detail sheet", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const vmBackupCell = screen.getByText("VM Backup Daily");
      const row = vmBackupCell.closest("tr")!;
      fireEvent.keyDown(row, { key: " " });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("rows have cursor-pointer class", () => {
      render(<JobTable jobs={MOCK_JOBS} />);

      const vmBackupCell = screen.getByText("VM Backup Daily");
      const row = vmBackupCell.closest("tr");
      expect(row!.className).toMatch(/cursor-pointer/);
    });
  });

  describe("column sorting", () => {
    it("sorts by Source Size values with nulls last", () => {
      const jobs = [
        createEnrichedJob({ JobName: "Small Job", SourceSizeGB: 200 }),
        createEnrichedJob({ JobName: "Large Job", SourceSizeGB: 1536 }),
        createEnrichedJob({ JobName: "Medium Job", SourceSizeGB: 500 }),
        createEnrichedJob({ JobName: "Unknown Size", SourceSizeGB: null }),
      ];
      render(<JobTable jobs={jobs} />);

      const sortButton = screen.getByRole("button", {
        name: /source size/i,
      });

      fireEvent.click(sortButton);
      const ascending = getJobNamesInOrder();

      fireEvent.click(sortButton);
      const descending = getJobNamesInOrder();

      const ascendingValues = [
        "Small Job",
        "Medium Job",
        "Large Job",
        "Unknown Size",
      ];
      const descendingValues = [
        "Large Job",
        "Medium Job",
        "Small Job",
        "Unknown Size",
      ];

      if (JSON.stringify(ascending) === JSON.stringify(ascendingValues)) {
        expect(descending).toEqual(descendingValues);
      } else {
        expect(ascending).toEqual(descendingValues);
        expect(descending).toEqual(ascendingValues);
      }
    });

    it("sorts by Change Rate values with nulls last", () => {
      const jobs = [
        createEnrichedJob({
          JobName: "Low Change",
          sessionData: {
            JobName: "Low Change",
            MaxDataSize: null,
            AvgChangeRate: 5.2,
            SuccessRate: null,
            SessionCount: null,
            Fails: null,
            AvgJobTime: null,
            MaxJobTime: null,
          },
        }),
        createEnrichedJob({
          JobName: "High Change",
          sessionData: {
            JobName: "High Change",
            MaxDataSize: null,
            AvgChangeRate: 55.0,
            SuccessRate: null,
            SessionCount: null,
            Fails: null,
            AvgJobTime: null,
            MaxJobTime: null,
          },
        }),
        createEnrichedJob({
          JobName: "Medium Change",
          sessionData: {
            JobName: "Medium Change",
            MaxDataSize: null,
            AvgChangeRate: 15.5,
            SuccessRate: null,
            SessionCount: null,
            Fails: null,
            AvgJobTime: null,
            MaxJobTime: null,
          },
        }),
        createEnrichedJob({ JobName: "No Session", sessionData: null }),
      ];
      render(<JobTable jobs={jobs} />);

      const sortButton = screen.getByRole("button", {
        name: /change rate/i,
      });

      fireEvent.click(sortButton);
      const ascending = getJobNamesInOrder();

      fireEvent.click(sortButton);
      const descending = getJobNamesInOrder();

      const ascendingValues = [
        "Low Change",
        "Medium Change",
        "High Change",
        "No Session",
      ];
      const descendingValues = [
        "High Change",
        "Medium Change",
        "Low Change",
        "No Session",
      ];

      if (JSON.stringify(ascending) === JSON.stringify(ascendingValues)) {
        expect(descending).toEqual(descendingValues);
      } else {
        expect(ascending).toEqual(descendingValues);
        expect(descending).toEqual(ascendingValues);
      }
    });
  });
});
