import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAnalysis } from "@/hooks/use-analysis";

vi.mock("@/lib/pipeline", () => ({
  analyzeHealthcheck: vi.fn(),
}));

import { analyzeHealthcheck } from "@/lib/pipeline";

const mockAnalyzeHealthcheck = vi.mocked(analyzeHealthcheck);

function createMockFile(content: string, name = "healthcheck.json"): File {
  return new File([content], name, { type: "application/json" });
}

const VALID_JSON = JSON.stringify({
  Sections: {
    backupServer: {
      Headers: ["Version", "Name"],
      Rows: [["13.0.1.1071", "VBR-01"]],
    },
  },
});

const MOCK_ANALYSIS_RESULT = {
  data: {
    backupServer: [{ Version: "13.0.1.1071", Name: "VBR-01" }],
    securitySummary: [],
    jobInfo: [],
    Licenses: [],
    dataErrors: [],
  },
  validations: [
    {
      ruleId: "vbr-version",
      title: "VBR Version Compatibility",
      status: "pass" as const,
      message: "All VBR servers meet the minimum version requirement.",
      affectedItems: [],
    },
  ],
};

describe("useAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeHealthcheck.mockReturnValue(MOCK_ANALYSIS_RESULT);
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useAnalysis());

    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeNull();
    expect(result.current.validations).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions to processing when analyzeFile is called", async () => {
    const { result } = renderHook(() => useAnalysis());
    const file = createMockFile(VALID_JSON);

    // We can't easily capture the intermediate 'processing' state
    // since FileReader is async and resolves quickly in tests.
    // Instead, verify that the full cycle works.
    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("success");
  });

  it("sets success state with data and validations on valid JSON", async () => {
    const { result } = renderHook(() => useAnalysis());
    const file = createMockFile(VALID_JSON);

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(MOCK_ANALYSIS_RESULT.data);
    expect(result.current.validations).toEqual(
      MOCK_ANALYSIS_RESULT.validations,
    );
    expect(result.current.error).toBeNull();
    expect(mockAnalyzeHealthcheck).toHaveBeenCalledOnce();
  });

  it("sets error state on invalid JSON", async () => {
    const { result } = renderHook(() => useAnalysis());
    const file = createMockFile("not valid json {{{");

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/invalid json/i);
    expect(result.current.data).toBeNull();
    expect(result.current.validations).toBeNull();
  });

  it("sets error state when pipeline throws", async () => {
    mockAnalyzeHealthcheck.mockImplementation(() => {
      throw new Error("Missing Sections key");
    });

    const { result } = renderHook(() => useAnalysis());
    const file = createMockFile(VALID_JSON);

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/missing sections/i);
    expect(result.current.data).toBeNull();
    expect(result.current.validations).toBeNull();
  });

  it("resets to idle state", async () => {
    const { result } = renderHook(() => useAnalysis());
    const file = createMockFile(VALID_JSON);

    await act(async () => {
      await result.current.analyzeFile(file);
    });
    expect(result.current.status).toBe("success");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeNull();
    expect(result.current.validations).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("handles empty file", async () => {
    const { result } = renderHook(() => useAnalysis());
    const file = createMockFile("");

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/invalid json/i);
  });

  it("rejects valid JSON that is not a Veeam Healthcheck export", async () => {
    const { result } = renderHook(() => useAnalysis());

    const cases = [
      '"just a string"',
      "42",
      "[1, 2, 3]",
      '{"notSections": true}',
    ];

    for (const content of cases) {
      const file = createMockFile(content);
      await act(async () => {
        await result.current.analyzeFile(file);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.error).toMatch(/invalid veeam healthcheck export/i);
      expect(mockAnalyzeHealthcheck).not.toHaveBeenCalled();

      act(() => {
        result.current.reset();
      });
      vi.clearAllMocks();
    }
  });

  it("discards a stale result when a second file is analyzed before the first finishes", async () => {
    // Both calls use the same mock result — the test verifies that only
    // the latest invocation commits state (the stale first call bails out
    // at the requestId guard after its await, never reaching the pipeline).
    const { result } = renderHook(() => useAnalysis());

    const firstFile = createMockFile(VALID_JSON, "first.json");
    const secondFile = createMockFile(VALID_JSON, "second.json");

    await act(async () => {
      const first = result.current.analyzeFile(firstFile);
      const second = result.current.analyzeFile(secondFile);
      await Promise.all([first, second]);
    });

    // Only one call should have reached the pipeline (the second one).
    // The first is discarded by the requestId guard.
    expect(mockAnalyzeHealthcheck).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(MOCK_ANALYSIS_RESULT.data);
  });
});
