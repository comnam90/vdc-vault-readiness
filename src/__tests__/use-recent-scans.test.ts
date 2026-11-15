import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/indexed-db", () => ({
  getRecentScans: vi.fn(),
  deleteScan: vi.fn(),
}));

import { useRecentScans } from "@/hooks/use-recent-scans";
import { deleteScan, getRecentScans } from "@/lib/indexed-db";

const mockGetRecentScans = vi.mocked(getRecentScans);
const mockDeleteScan = vi.mocked(deleteScan);

const SCAN_A = {
  id: 1,
  filename: "a.json",
  uploadedAt: "2026-05-06T10:00:00Z",
  jobCount: 10,
  sourceTb: 5,
  vbrVersion: "13.0.0.0",
};
const SCAN_B = {
  id: 2,
  filename: "b.json",
  uploadedAt: "2026-05-06T11:00:00Z",
  jobCount: 20,
  sourceTb: null,
  vbrVersion: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRecentScans", () => {
  it("starts with an empty list before the initial fetch resolves", () => {
    mockGetRecentScans.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRecentScans());
    expect(result.current.recentScans).toEqual([]);
  });

  it("populates the list with the result of getRecentScans on mount", async () => {
    mockGetRecentScans.mockResolvedValue([SCAN_B, SCAN_A]);
    const { result } = renderHook(() => useRecentScans());
    await waitFor(() => {
      expect(result.current.recentScans).toEqual([SCAN_B, SCAN_A]);
    });
    expect(mockGetRecentScans).toHaveBeenCalledTimes(1);
  });

  it("removeScan calls deleteScan and refreshes the list afterwards", async () => {
    mockGetRecentScans.mockResolvedValueOnce([SCAN_A, SCAN_B]);
    const { result } = renderHook(() => useRecentScans());
    await waitFor(() => {
      expect(result.current.recentScans).toHaveLength(2);
    });

    mockDeleteScan.mockResolvedValueOnce(undefined);
    mockGetRecentScans.mockResolvedValueOnce([SCAN_B]);

    await act(async () => {
      await result.current.removeScan(SCAN_A.id);
    });

    expect(mockDeleteScan).toHaveBeenCalledWith(SCAN_A.id);
    expect(result.current.recentScans).toEqual([SCAN_B]);
  });

  it("refreshScans re-fetches the list", async () => {
    mockGetRecentScans.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useRecentScans());
    await waitFor(() => {
      expect(mockGetRecentScans).toHaveBeenCalledTimes(1);
    });

    mockGetRecentScans.mockResolvedValueOnce([SCAN_A]);
    await act(async () => {
      await result.current.refreshScans();
    });

    expect(result.current.recentScans).toEqual([SCAN_A]);
    expect(mockGetRecentScans).toHaveBeenCalledTimes(2);
  });

  it("swallows errors from getRecentScans and keeps the list empty", async () => {
    mockGetRecentScans.mockRejectedValueOnce(new Error("boom"));
    const consoleSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => useRecentScans());
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    expect(result.current.recentScans).toEqual([]);
    consoleSpy.mockRestore();
  });
});
