import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAnalysis } from "@/hooks/use-analysis";
import { PIPELINE_STEPS } from "@/lib/constants";

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
    jobSessionSummary: [],
    sobr: [],
    capExtents: [],
    extents: [],
    archExtents: [],
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
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));

    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeNull();
    expect(result.current.validations).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.completedSteps).toEqual([]);
    expect(result.current.currentStep).toBeNull();
  });

  it("transitions to processing when analyzeFile is called", async () => {
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
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
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
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

  it("completes all pipeline steps on success", async () => {
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
    const file = createMockFile(VALID_JSON);

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.completedSteps).toEqual(
      PIPELINE_STEPS.map((s) => s.id),
    );
    expect(result.current.currentStep).toBeNull();
  });

  it("sets error state on invalid JSON", async () => {
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
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

    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
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
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
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
    expect(result.current.completedSteps).toEqual([]);
    expect(result.current.currentStep).toBeNull();
  });

  it("handles empty file", async () => {
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
    const file = createMockFile("");

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/invalid json/i);
  });

  it("rejects valid JSON that is not a Veeam Healthcheck export", async () => {
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));

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
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));

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

  it("handles non-Error thrown from pipeline by using the generic error message", async () => {
    // The catch block has: err instanceof Error ? err.message : "An unexpected error occurred."
    // This tests the else branch by throwing a non-Error value.
    mockAnalyzeHealthcheck.mockImplementation(() => {
      throw "string error, not an Error object";
    });

    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
    const file = createMockFile(VALID_JSON);

    await act(async () => {
      await result.current.analyzeFile(file);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("An unexpected error occurred.");
    expect(result.current.data).toBeNull();
    expect(result.current.validations).toBeNull();
  });

  it("stale check after analyzeHealthcheck prevents step loop from running", async () => {
    // The first call must get past readFileAsText and analyzeHealthcheck,
    // then become stale before entering the step loop. We achieve this by
    // having analyzeHealthcheck trigger a second analyzeFile call.
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
    const secondFile = createMockFile(VALID_JSON, "second.json");

    let callCount = 0;
    mockAnalyzeHealthcheck.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // During the first call's analyzeHealthcheck, fire a second analysis.
        // This increments requestIdRef, making the first call stale at line 113.
        result.current.analyzeFile(secondFile);
      }
      return MOCK_ANALYSIS_RESULT;
    });

    const firstFile = createMockFile(VALID_JSON, "first.json");

    await act(async () => {
      await result.current.analyzeFile(firstFile);
      // Allow the second call (triggered inside mock) to complete
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockAnalyzeHealthcheck).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(MOCK_ANALYSIS_RESULT.data);
  });

  it("stale check during step animation loop aborts the first call", async () => {
    // The first call must enter the step loop, then become stale mid-loop.
    // We use a non-zero stepDelay so there's time between loop iterations,
    // and fire the second call after a short delay.
    const { result } = renderHook(() => useAnalysis({ stepDelay: 100 }));

    const firstFile = createMockFile(VALID_JSON, "first.json");
    const secondFile = createMockFile(VALID_JSON, "second.json");

    await act(async () => {
      const firstPromise = result.current.analyzeFile(firstFile);
      // Wait just enough for the first call to enter the step loop
      // (past readFileAsText + analyzeHealthcheck), then fire the second
      await new Promise((r) => setTimeout(r, 50));
      const secondPromise = result.current.analyzeFile(secondFile);
      await Promise.all([firstPromise, secondPromise]);
    });

    // The second call should complete with all steps
    expect(result.current.status).toBe("success");
    expect(result.current.completedSteps).toEqual(
      PIPELINE_STEPS.map((s) => s.id),
    );
    expect(result.current.currentStep).toBeNull();
  });

  it("stale check in catch block prevents error state from stale call", async () => {
    // The first call must throw in the try block after readFileAsText, but
    // the call must be stale before the catch runs. We achieve this by
    // having analyzeHealthcheck throw AND trigger a second call.
    const { result } = renderHook(() => useAnalysis({ stepDelay: 0 }));
    const secondFile = createMockFile(VALID_JSON, "second.json");

    let callCount = 0;
    mockAnalyzeHealthcheck.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Trigger second call to make this one stale, then throw
        result.current.analyzeFile(secondFile);
        throw new Error("This error should be discarded");
      }
      return MOCK_ANALYSIS_RESULT;
    });

    const firstFile = createMockFile(VALID_JSON, "first.json");

    await act(async () => {
      await result.current.analyzeFile(firstFile);
      await new Promise((r) => setTimeout(r, 50));
    });

    // The first call's error should be discarded (stale), second call succeeds
    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeNull();
    expect(mockAnalyzeHealthcheck).toHaveBeenCalledTimes(2);
  });
});
