import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import type { AnalysisStatus } from "@/hooks/use-analysis";

const mockAnalyzeFile = vi.fn();
const mockReset = vi.fn();

let mockStatus: AnalysisStatus = "idle";
let mockError: string | null = null;
let mockValidations: { ruleId: string }[] | null = null;

vi.mock("@/hooks/use-analysis", () => ({
  useAnalysis: () => ({
    status: mockStatus,
    data: null,
    validations: mockValidations,
    error: mockError,
    analyzeFile: mockAnalyzeFile,
    reset: mockReset,
  }),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatus = "idle";
    mockError = null;
    mockValidations = null;
  });

  it("renders file upload in idle state", () => {
    render(<App />);
    expect(
      screen.getByText(/drop veeam healthcheck json here/i),
    ).toBeInTheDocument();
  });

  it("renders loading state when processing", () => {
    mockStatus = "processing";
    render(<App />);
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
  });

  it("renders error state with message and try again button", () => {
    mockStatus = "error";
    mockError = "Invalid JSON: bad file";
    render(<App />);

    expect(screen.getByText(/invalid json: bad file/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset when Try Again button is clicked in error state", () => {
    mockStatus = "error";
    mockError = "Something went wrong";
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("renders success state with validation count", () => {
    mockStatus = "success";
    mockValidations = [
      { ruleId: "vbr-version" },
      { ruleId: "global-encryption" },
      { ruleId: "job-encryption" },
    ];
    render(<App />);

    expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    expect(screen.getByText(/3 validation rules ran/i)).toBeInTheDocument();
  });

  it("calls reset when Upload Another button is clicked in success state", () => {
    mockStatus = "success";
    mockValidations = [{ ruleId: "vbr-version" }];
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /upload another/i }));
    expect(mockReset).toHaveBeenCalledOnce();
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
