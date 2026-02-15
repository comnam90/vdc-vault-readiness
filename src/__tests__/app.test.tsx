import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import type { AnalysisStatus } from "@/hooks/use-analysis";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";

const mockAnalyzeFile = vi.fn();
const mockReset = vi.fn();

let mockStatus: AnalysisStatus = "idle";
let mockError: string | null = null;
let mockData: NormalizedDataset | null = null;
let mockValidations: ValidationResult[] | null = null;
let mockCompletedSteps: string[] = [];
let mockCurrentStep: string | null = null;

vi.mock("@/hooks/use-analysis", () => ({
  useAnalysis: () => ({
    status: mockStatus,
    data: mockData,
    validations: mockValidations,
    error: mockError,
    completedSteps: mockCompletedSteps,
    currentStep: mockCurrentStep,
    analyzeFile: mockAnalyzeFile,
    reset: mockReset,
  }),
}));

const MOCK_DATA: NormalizedDataset = {
  backupServer: [{ Version: "13.0.1.1071", Name: "VBR-01" }],
  securitySummary: [
    { BackupFileEncryptionEnabled: true, ConfigBackupEncryptionEnabled: true },
  ],
  jobInfo: [
    {
      JobName: "Job A",
      JobType: "VMware Backup",
      Encrypted: true,
      RepoName: "Repo",
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
    },
  ],
  Licenses: [{ Edition: "Enterprise Plus", Status: "Active" }],
  jobSessionSummary: [],
  sobr: [],
  capExtents: [],
  archExtents: [],
  dataErrors: [],
};

const MOCK_VALIDATIONS: ValidationResult[] = [
  {
    ruleId: "vbr-version",
    title: "VBR Version Compatibility",
    status: "pass",
    message: "All VBR servers meet the minimum version.",
    affectedItems: [],
  },
  {
    ruleId: "job-encryption",
    title: "Job Encryption Audit",
    status: "pass",
    message: "All jobs encrypted.",
    affectedItems: [],
  },
  {
    ruleId: "global-encryption",
    title: "Global Encryption Configuration",
    status: "pass",
    message: "Global encryption enabled.",
    affectedItems: [],
  },
];

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatus = "idle";
    mockError = null;
    mockData = null;
    mockValidations = null;
    mockCompletedSteps = [];
    mockCurrentStep = null;
  });

  it("renders file upload in idle state", () => {
    render(<App />);
    expect(
      screen.getByText(/drop veeam healthcheck json here/i),
    ).toBeInTheDocument();
  });

  it("renders checklist loader when processing", () => {
    mockStatus = "processing";
    mockCurrentStep = "parse";
    render(<App />);
    expect(screen.getByTestId("checklist-loader")).toBeInTheDocument();
    expect(screen.getByText("Parse healthcheck data...")).toBeInTheDocument();
  });

  it("renders error state with message and try again button", () => {
    mockStatus = "error";
    mockError = "Invalid JSON: bad file";
    render(<App />);

    expect(screen.getByText(/invalid json: bad file/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("calls reset when Try Again button is clicked in error state", () => {
    mockStatus = "error";
    mockError = "Something went wrong";
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("renders DashboardView in success state", () => {
    mockStatus = "success";
    mockData = MOCK_DATA;
    mockValidations = MOCK_VALIDATIONS;
    render(<App />);

    // DashboardView renders the title, summary cards, and Scan Complete badge
    expect(screen.getByText("VDC Vault Readiness")).toBeInTheDocument();
    expect(screen.getByText("Scan Complete")).toBeInTheDocument();
    expect(screen.getByText("13.0.1.1071")).toBeInTheDocument();
  });

  it("calls reset when Upload New button is clicked in success state", () => {
    mockStatus = "success";
    mockData = MOCK_DATA;
    mockValidations = MOCK_VALIDATIONS;
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /upload new/i }));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("applies entrance animation to idle state container", () => {
    render(<App />);

    const wrapper = screen
      .getByTestId("drop-zone")
      .closest("[class*='animate-in']");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toMatch(/fade-in/);
    expect(wrapper!.className).toMatch(/slide-in-from-bottom/);
  });

  it("applies entrance animation to error state container", () => {
    mockStatus = "error";
    mockError = "Something went wrong";
    render(<App />);

    const alert = screen
      .getByText(/something went wrong/i)
      .closest("[role='alert']");
    const wrapper = alert!.closest("[class*='animate-in']");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toMatch(/fade-in/);
    expect(wrapper!.className).toMatch(/slide-in-from-bottom/);
  });

  it("calls analyzeFile when a file is dropped", async () => {
    render(<App />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(['{"test": true}'], "healthcheck.json", {
      type: "application/json",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(mockAnalyzeFile).toHaveBeenCalledWith(file);
    });
  });
});
