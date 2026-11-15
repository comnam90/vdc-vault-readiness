import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoredScanSummary } from "@/lib/indexed-db";

const mockRemoveScan = vi.fn(() => Promise.resolve());
const mockRefreshScans = vi.fn(() => Promise.resolve());
let mockRecentScans: StoredScanSummary[] = [];

vi.mock("@/hooks/use-recent-scans", () => ({
  useRecentScans: () => ({
    recentScans: mockRecentScans,
    removeScan: mockRemoveScan,
    refreshScans: mockRefreshScans,
  }),
}));

import { FileUpload } from "@/components/dashboard/file-upload";

beforeEach(() => {
  mockRecentScans = [];
  mockRemoveScan.mockClear();
  mockRefreshScans.mockClear();
});

describe("FileUpload", () => {
  it("renders the drop zone with instructional text", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    expect(
      screen.getByText(/drop veeam healthcheck json here/i),
    ).toBeInTheDocument();
  });

  it("renders a file input that accepts .json files", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toBe(".json");
  });

  it("calls onFileSelected when a file is chosen via input", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);

    const file = new File(['{"test": true}'], "healthcheck.json", {
      type: "application/json",
    });

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("calls onFileSelected when a file is dropped", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(['{"test": true}'], "healthcheck.json", {
      type: "application/json",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("applies drag-over styling on drag enter and removes on drag leave", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.dragOver(dropZone, {
      dataTransfer: { types: ["Files"] },
    });

    expect(dropZone.className).toMatch(/border-primary/);

    fireEvent.dragLeave(dropZone);

    expect(dropZone.className).not.toMatch(/border-primary/);
  });

  it("renders browse button text", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    expect(screen.getByText(/browse/i)).toBeInTheDocument();
  });

  it("is keyboard-focusable with role=button", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    expect(dropZone).toHaveAttribute("role", "button");
    expect(dropZone).toHaveAttribute("tabindex", "0");
  });

  it("opens file dialog on Enter key", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("opens file dialog on Space key", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: " " });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("has premium drop-zone hover and surface classes", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    // When not dragging, hover classes should be present in the class list
    expect(dropZone.className).toMatch(/bg-card\/80/);
    expect(dropZone.className).toMatch(/shadow-sm/);
    expect(dropZone.className).toMatch(/hover:shadow-md/);
    expect(dropZone.className).toMatch(/backdrop-blur-sm/);
    expect(dropZone.className).toMatch(/hover:border-muted-foreground\/50/);
    expect(dropZone.className).toMatch(/hover:border-solid/);
  });

  it("has hover class for icon rise animation", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const uploadIcon = screen
      .getByTestId("drop-zone")
      .querySelector("[data-testid='upload-icon-wrapper']");
    expect(uploadIcon).not.toBeNull();
    expect(uploadIcon!.className).toMatch(/motion-safe:group-hover\//);
  });

  describe("error state", () => {
    it("shows destructive border when error prop is set", () => {
      render(<FileUpload onFileSelected={vi.fn()} error="Invalid JSON file" />);

      const dropZone = screen.getByTestId("drop-zone");
      expect(dropZone.className).toMatch(/border-destructive/);
    });

    it("applies shake animation when error prop is set", () => {
      render(<FileUpload onFileSelected={vi.fn()} error="Invalid JSON file" />);

      const dropZone = screen.getByTestId("drop-zone");
      expect(dropZone.className).toMatch(/motion-safe:animate-shake/);
    });

    it("displays the error message text", () => {
      render(<FileUpload onFileSelected={vi.fn()} error="Invalid JSON file" />);

      expect(screen.getByText("Invalid JSON file")).toBeInTheDocument();
    });

    it("does not show error message when error prop is absent", () => {
      render(<FileUpload onFileSelected={vi.fn()} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("drag-over state", () => {
    it("applies pulse animation on drag over", () => {
      render(<FileUpload onFileSelected={vi.fn()} />);

      const dropZone = screen.getByTestId("drop-zone");
      fireEvent.dragOver(dropZone, {
        dataTransfer: { types: ["Files"] },
      });

      expect(dropZone.className).toMatch(/motion-safe:animate-drag-pulse/);
    });
  });

  describe("recent scans section", () => {
    const NOW_MS = new Date("2026-05-06T14:30:00Z").getTime();
    const RECENT_SCANS: StoredScanSummary[] = [
      {
        id: NOW_MS - 60 * 1000, // 1 min ago → "1 min ago"
        filename: "alpha.json",
        uploadedAt: new Date(NOW_MS - 60 * 1000).toISOString(),
        jobCount: 30,
        sourceTb: 12.5,
        vbrVersion: "13.0.1.1071",
      },
      {
        id: NOW_MS - 25 * 60 * 60 * 1000, // ~yesterday
        filename: "beta.json",
        uploadedAt: new Date(NOW_MS - 25 * 60 * 60 * 1000).toISOString(),
        jobCount: 5,
        sourceTb: null,
        vbrVersion: null,
      },
    ];

    it("does not render the Recent Scans section when the list is empty", () => {
      render(<FileUpload onFileSelected={vi.fn()} />);
      expect(
        screen.queryByRole("region", { name: /recent scans/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/recent scans/i)).not.toBeInTheDocument();
    });

    it("renders the Recent Scans section when the list is non-empty", () => {
      mockRecentScans = RECENT_SCANS;
      render(<FileUpload onFileSelected={vi.fn()} />);
      expect(
        screen.getByRole("region", { name: /recent scans/i }),
      ).toBeInTheDocument();
    });

    it("renders one row per scan with filename, jobCount, sourceTb, and vbrVersion", () => {
      mockRecentScans = RECENT_SCANS;
      render(<FileUpload onFileSelected={vi.fn()} />);

      expect(screen.getByText("alpha.json")).toBeInTheDocument();
      expect(screen.getByText("beta.json")).toBeInTheDocument();
      // jobCount
      expect(screen.getByText(/30 jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/5 jobs/i)).toBeInTheDocument();
      // vbrVersion (may be split across nodes — use a regex that tolerates that)
      expect(screen.getByText(/13\.0\.1\.1071/)).toBeInTheDocument();
    });

    it("renders an em-dash placeholder when sourceTb or vbrVersion is null", () => {
      mockRecentScans = [RECENT_SCANS[1]!];
      render(<FileUpload onFileSelected={vi.fn()} />);
      // beta.json has both sourceTb and vbrVersion null → at least one "—"
      expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });

    it("invokes onLoadRecent with the scan id when Load is clicked", () => {
      const onLoadRecent = vi.fn();
      mockRecentScans = [RECENT_SCANS[0]!];
      render(
        <FileUpload onFileSelected={vi.fn()} onLoadRecent={onLoadRecent} />,
      );
      const loadBtn = screen.getByRole("button", { name: /load scan alpha/i });
      fireEvent.click(loadBtn);
      expect(onLoadRecent).toHaveBeenCalledWith(RECENT_SCANS[0]!.id);
    });

    it("invokes removeScan with the scan id when Delete is clicked", () => {
      mockRecentScans = [RECENT_SCANS[0]!];
      render(<FileUpload onFileSelected={vi.fn()} onLoadRecent={vi.fn()} />);
      const deleteBtn = screen.getByRole("button", {
        name: /delete scan alpha/i,
      });
      fireEvent.click(deleteBtn);
      expect(mockRemoveScan).toHaveBeenCalledWith(RECENT_SCANS[0]!.id);
    });

    it("disables the Load button when onLoadRecent is not provided", () => {
      mockRecentScans = [RECENT_SCANS[0]!];
      render(<FileUpload onFileSelected={vi.fn()} />);
      const loadBtn = screen.getByRole("button", { name: /load scan alpha/i });
      expect(loadBtn).toBeDisabled();
    });

    it("uses motion-safe classes on the section animation", () => {
      mockRecentScans = RECENT_SCANS;
      render(<FileUpload onFileSelected={vi.fn()} />);
      const region = screen.getByRole("region", { name: /recent scans/i });
      expect(region.className).toMatch(/motion-safe:/);
    });

    it("does not stop propagation onto the dropzone when a row button is clicked", () => {
      const onFileSelected = vi.fn();
      mockRecentScans = [RECENT_SCANS[0]!];
      render(
        <FileUpload onFileSelected={onFileSelected} onLoadRecent={vi.fn()} />,
      );
      const loadBtn = screen.getByRole("button", { name: /load scan alpha/i });
      fireEvent.click(loadBtn);
      // Dropzone click handler must not have triggered a file picker via
      // bubbling — onFileSelected only fires from drop or input change.
      expect(onFileSelected).not.toHaveBeenCalled();
    });
  });
});
