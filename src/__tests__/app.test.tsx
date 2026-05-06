import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import type { AnalysisStatus } from "@/hooks/use-analysis";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import type { StoredScan, StoredScanSummary } from "@/lib/indexed-db";

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

const mockSaveScan = vi.fn();
const mockLoadScanPayload = vi.fn();
const mockGetRecentScans = vi.fn();
const mockDeleteScan = vi.fn();

vi.mock("@/lib/indexed-db", () => ({
  saveScan: (...args: unknown[]) => mockSaveScan(...args),
  loadScanPayload: (...args: unknown[]) => mockLoadScanPayload(...args),
  getRecentScans: (...args: unknown[]) => mockGetRecentScans(...args),
  deleteScan: (...args: unknown[]) => mockDeleteScan(...args),
}));

let mockRecentScansList: StoredScanSummary[] = [];

vi.mock("@/hooks/use-recent-scans", () => ({
  useRecentScans: () => ({
    recentScans: mockRecentScansList,
    removeScan: vi.fn(),
    refreshScans: vi.fn(),
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
  extents: [],
  archExtents: [],
  repos: [],
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
    mockRecentScansList = [];
    mockSaveScan.mockResolvedValue(1);
    mockLoadScanPayload.mockResolvedValue(null);
    mockGetRecentScans.mockResolvedValue([]);
    mockDeleteScan.mockResolvedValue(undefined);
  });

  it("renders file upload in idle state", () => {
    render(<App />);
    expect(
      screen.getByText(/drop veeam healthcheck json here/i),
    ).toBeInTheDocument();
  });

  it("renders value proposition text on landing page", () => {
    render(<App />);
    expect(screen.getByText(/checks vbr version/i)).toBeInTheDocument();
  });

  it("renders Veeam Healthcheck link pointing to VeeamHub repo", () => {
    render(<App />);
    const link = screen.getByRole("link", { name: /veeam healthcheck/i });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/VeeamHub/veeam-healthcheck/",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent(/opens in new tab/i);
  });

  it("applies atmosphere gradient on app shell", () => {
    render(<App />);
    const shell = screen.getByTestId("app-shell");
    expect(shell.className).toMatch(/bg-\[var\(--surface-gradient\)\]/);
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

  it("renders footer in idle state", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
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

    const alert = screen.getByRole("alert");
    const wrapper = alert.closest("[class*='animate-in']");
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
      expect(mockAnalyzeFile).toHaveBeenCalledTimes(1);
    });
    const passed = mockAnalyzeFile.mock.calls[0]![0] as File;
    expect(passed).toBeInstanceOf(File);
    expect(passed.name).toBe("healthcheck.json");
  });

  describe("recent scans orchestration", () => {
    it("saves the scan to IndexedDB after a successful upload", async () => {
      mockStatus = "idle";
      const { rerender } = render(<App />);

      const file = new File(['{"hello":"world"}'], "alpha.json", {
        type: "application/json",
      });
      fireEvent.drop(screen.getByTestId("drop-zone"), {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => expect(mockAnalyzeFile).toHaveBeenCalledTimes(1));

      mockStatus = "success";
      mockData = MOCK_DATA;
      mockValidations = MOCK_VALIDATIONS;
      rerender(<App />);

      await waitFor(() => expect(mockSaveScan).toHaveBeenCalledTimes(1));

      const saved = mockSaveScan.mock.calls[0]![0] as Omit<StoredScan, "id">;
      expect(saved.filename).toBe("alpha.json");
      expect(saved.jobCount).toBe(MOCK_DATA.jobInfo.length);
      expect(saved.vbrVersion).toBe("13.0.1.1071");
      expect(saved.sourceTb).toBeNull(); // MOCK_DATA has no SourceSizeGB
      expect(saved.rawJson).toBe('{"hello":"world"}');
      expect(typeof saved.uploadedAt).toBe("string");
      expect(() => new Date(saved.uploadedAt).toISOString()).not.toThrow();
    });

    it("does not save when analysis ends in an error", async () => {
      mockStatus = "idle";
      const { rerender } = render(<App />);

      const file = new File(["bad json"], "bad.json", {
        type: "application/json",
      });
      fireEvent.drop(screen.getByTestId("drop-zone"), {
        dataTransfer: { files: [file] },
      });
      await waitFor(() => expect(mockAnalyzeFile).toHaveBeenCalledTimes(1));

      mockStatus = "error";
      mockError = "Invalid JSON";
      rerender(<App />);

      // Give any pending effect a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(mockSaveScan).not.toHaveBeenCalled();
    });

    it("loads a recent scan and feeds the synthetic File into analyzeFile without re-saving", async () => {
      const stored: StoredScan = {
        id: 12345,
        filename: "stored.json",
        uploadedAt: "2026-05-06T10:00:00Z",
        jobCount: 7,
        sourceTb: 9.5,
        vbrVersion: "13.0.0.0",
        rawJson: '{"Sections":{"backupServer":{"Headers":[],"Rows":[]}}}',
      };
      mockLoadScanPayload.mockResolvedValueOnce(stored);
      mockRecentScansList = [
        {
          id: stored.id,
          filename: stored.filename,
          uploadedAt: stored.uploadedAt,
          jobCount: stored.jobCount,
          sourceTb: stored.sourceTb,
          vbrVersion: stored.vbrVersion,
        },
      ];

      mockStatus = "idle";
      const { rerender } = render(<App />);

      fireEvent.click(
        screen.getByRole("button", { name: /load scan stored\.json/i }),
      );

      await waitFor(() =>
        expect(mockLoadScanPayload).toHaveBeenCalledWith(stored.id),
      );
      await waitFor(() => expect(mockAnalyzeFile).toHaveBeenCalledTimes(1));

      const passed = mockAnalyzeFile.mock.calls[0]![0] as File;
      expect(passed).toBeInstanceOf(File);
      expect(passed.name).toBe("stored.json");
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(passed);
      });
      expect(text).toBe(stored.rawJson);

      // Now drive the success transition; the load path must NOT trigger save.
      mockStatus = "success";
      mockData = MOCK_DATA;
      mockValidations = MOCK_VALIDATIONS;
      rerender(<App />);

      await new Promise((r) => setTimeout(r, 10));
      expect(mockSaveScan).not.toHaveBeenCalled();
    });
  });
});
