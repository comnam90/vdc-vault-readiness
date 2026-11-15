# Sizing Result Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist sizing calculator results across tab navigation by lifting result state into a `useCalculatorApi` hook above the tab layer, with automatic invalidation when job exclusions or settings change.

**Architecture:** A new `useCalculatorApi` hook lives in `DashboardView`, above the Radix UI `TabsContent` that unmounts `CalculatorInputs` on tab switch. The hook owns `result`, `upgradeResult`, `growthSeries`, `error`, `loading`, and `hasConsented`. It uses a serialised `inputKey` in a `useEffect` to clear results when `excludedJobNames` or `settings` change. `CalculatorInputs` becomes fully controlled — it receives state and callbacks as props, owns only `consentOpen`.

**Tech Stack:** React 19, TypeScript 5.9, Vitest + React Testing Library (`renderHook`/`act`), `@testing-library/react`

---

## File Map

| File                                             | Action                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| `src/hooks/use-calculator-api.ts`                | Create — new hook                                  |
| `src/__tests__/use-calculator-api.test.ts`       | Create — hook tests                                |
| `src/components/dashboard/calculator-inputs.tsx` | Modify — replace local state with controlled props |
| `src/__tests__/calculator-inputs.test.tsx`       | Modify — refactor for controlled interface         |
| `src/components/dashboard/dashboard-view.tsx`    | Modify — instantiate hook, wire props              |

---

## Task 1: Create `use-calculator-api.ts` scaffold

**Files:**

- Create: `src/hooks/use-calculator-api.ts`

- [ ] **Step 1: Create the file with the complete TypeScript interface and a stub implementation**

```typescript
// src/hooks/use-calculator-api.ts
import { useCallback, useEffect, useState } from "react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import {
  generateGrowthSeries,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";
import type { NormalizedDataset } from "@/types/domain";
import type { GlobalSettings } from "@/types/settings";
import type { VmAgentResponse } from "@/types/veeam-api";
import { callVmAgentApi } from "@/lib/veeam-api";

export interface UseCalculatorApiOptions {
  data: NormalizedDataset;
  excludedJobNames: Set<string>;
  settings: GlobalSettings;
}

export interface UseCalculatorApiResult {
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  grantConsent: () => void;
  calculate: () => Promise<void>;
}

export function useCalculatorApi(
  _options: UseCalculatorApiOptions,
): UseCalculatorApiResult {
  return {
    result: null,
    upgradeResult: null,
    growthSeries: null,
    error: null,
    loading: false,
    hasConsented: false,
    grantConsent: () => {},
    calculate: async () => {},
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 2: Write failing hook tests — persistence, invalidation, consent

**Files:**

- Create: `src/__tests__/use-calculator-api.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/__tests__/use-calculator-api.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCalculatorApi,
  type UseCalculatorApiOptions,
} from "@/hooks/use-calculator-api";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type { NormalizedDataset } from "@/types/domain";
import type { VmAgentResponse } from "@/types/veeam-api";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

vi.mock("@/lib/calculator-aggregator", () => ({
  buildCalculatorSummary: vi.fn(),
}));

vi.mock("@/lib/veeam-api", () => ({
  callVmAgentApi: vi.fn(),
}));

vi.mock("@/lib/growth-projector", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/growth-projector")>();
  return { ...actual, generateGrowthSeries: vi.fn() };
});

import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { callVmAgentApi } from "@/lib/veeam-api";
import { generateGrowthSeries } from "@/lib/growth-projector";

const MOCK_API_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 0,
    capacityTierImmutabilityTaxGB: 0,
  },
};

const MOCK_V12_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 15.0,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 300,
    capacityTierImmutabilityTaxGB: 0,
  },
};

const MOCK_V13_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 250,
    capacityTierImmutabilityTaxGB: 0,
  },
};

const SAMPLE_GROWTH: GrowthSeriesPoint[] = [
  {
    name: "Year 1",
    daily: 1,
    weekly: 0.5,
    monthly: 0.5,
    yearly: 0.25,
    immutability: 0.1,
    total: 2.35,
  },
];

const DEFAULT_SUMMARY = {
  totalSourceDataTB: 10.5,
  weightedAvgChangeRate: 5.2,
  immutabilityDays: 30,
  maxRetentionDays: 14,
  originalMaxRetentionDays: 14,
  gfsWeekly: 1,
  gfsMonthly: 1,
  gfsYearly: 1,
  sourceDataBreakdown: [],
  gfsDistribution: [],
  retentionDistribution: [],
};

const mockDataVbr13 = {
  jobInfo: [],
  jobSessionSummary: [],
  backupServer: [{ Version: "13.0.1.1071", Name: "Server" }],
  sobr: [],
} as unknown as NormalizedDataset;

const mockDataVbr12 = {
  jobInfo: [],
  jobSessionSummary: [],
  backupServer: [{ Version: "12.1.2.456", Name: "Server" }],
  sobr: [],
} as unknown as NormalizedDataset;

const baseProps: UseCalculatorApiOptions = {
  data: mockDataVbr13,
  excludedJobNames: new Set<string>(),
  settings: DEFAULT_SETTINGS,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildCalculatorSummary).mockReturnValue(DEFAULT_SUMMARY);
  vi.mocked(callVmAgentApi).mockResolvedValue(MOCK_API_RESULT);
  vi.mocked(generateGrowthSeries).mockResolvedValue(SAMPLE_GROWTH);
});

describe("useCalculatorApi", () => {
  describe("initial state", () => {
    it("starts with all result state null and hasConsented false", () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      expect(result.current.result).toBeNull();
      expect(result.current.upgradeResult).toBeNull();
      expect(result.current.growthSeries).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.hasConsented).toBe(false);
    });
  });

  describe("consent", () => {
    it("grantConsent sets hasConsented to true", () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      expect(result.current.hasConsented).toBe(false);

      act(() => {
        result.current.grantConsent();
      });

      expect(result.current.hasConsented).toBe(true);
    });

    it("hasConsented persists across re-renders with identical inputs", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      act(() => {
        result.current.grantConsent();
      });
      expect(result.current.hasConsented).toBe(true);

      rerender(baseProps);

      expect(result.current.hasConsented).toBe(true);
    });
  });

  describe("result persistence", () => {
    it("persists result when re-rendered with identical inputs", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate();
      });

      expect(result.current.result).not.toBeNull();

      rerender(baseProps);

      expect(result.current.result).not.toBeNull();
    });

    it("persists growthSeries when re-rendered with identical inputs", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate();
      });

      expect(result.current.growthSeries).not.toBeNull();

      rerender(baseProps);

      expect(result.current.growthSeries).not.toBeNull();
    });
  });

  describe("invalidation", () => {
    it("clears result when excludedJobNames changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate();
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      expect(result.current.result).toBeNull();
    });

    it("clears growthSeries when excludedJobNames changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate();
      });
      expect(result.current.growthSeries).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      expect(result.current.growthSeries).toBeNull();
    });

    it("clears result when settings change", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate();
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({
          ...baseProps,
          settings: { ...DEFAULT_SETTINGS, targetCloud: "AWS" },
        });
      });

      expect(result.current.result).toBeNull();
    });

    it("clears error when inputs change", async () => {
      vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("network"));

      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate();
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      expect(result.current.error).toBeNull();
    });

    it("does NOT clear hasConsented when inputs change", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      act(() => {
        result.current.grantConsent();
      });
      expect(result.current.hasConsented).toBe(true);

      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      expect(result.current.hasConsented).toBe(true);
    });
  });

  describe("calculate()", () => {
    it("sets loading to true during the call and false after", async () => {
      let resolveApi!: (v: VmAgentResponse) => void;
      vi.mocked(callVmAgentApi).mockImplementationOnce(
        () =>
          new Promise<VmAgentResponse>((resolve) => {
            resolveApi = resolve;
          }),
      );
      vi.mocked(generateGrowthSeries).mockResolvedValue(SAMPLE_GROWTH);

      const { result } = renderHook(() => useCalculatorApi(baseProps));

      const calculatePromise = act(async () => {
        const p = result.current.calculate();
        await Promise.resolve();
        return p;
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveApi(MOCK_API_RESULT);
        await calculatePromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it("calls callVmAgentApi once for VBR 13 and sets result", async () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr13 }),
      );

      await act(async () => {
        await result.current.calculate();
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        DEFAULT_SUMMARY,
        0,
        "13.0.1.1071",
        undefined,
        DEFAULT_SETTINGS,
      );
      expect(result.current.result).toEqual(MOCK_API_RESULT);
      expect(result.current.upgradeResult).toBeNull();
    });

    it("calls callVmAgentApi twice for VBR 12 (v12 + v13 comparison)", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_V13_RESULT);

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate();
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(2);
      expect(result.current.result).toEqual(MOCK_V12_RESULT);
      expect(result.current.upgradeResult).toEqual(MOCK_V13_RESULT);
    });

    it("calls generateGrowthSeries for VBR 13", async () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr13 }),
      );

      await act(async () => {
        await result.current.calculate();
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
      expect(result.current.growthSeries).toEqual(SAMPLE_GROWTH);
    });

    it("sets error and clears result on API failure", async () => {
      vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("Network"));

      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toMatch(
        /could not retrieve sizing estimate/i,
      );
    });

    it("clears previous result and error before a new calculate() call", async () => {
      vi.mocked(callVmAgentApi)
        .mockRejectedValueOnce(new Error("first call fails"))
        .mockResolvedValueOnce(MOCK_API_RESULT);

      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate();
      });
      expect(result.current.error).not.toBeNull();

      await act(async () => {
        await result.current.calculate();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toEqual(MOCK_API_RESULT);
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
npx vitest run src/__tests__/use-calculator-api.test.ts
```

Expected: multiple FAIL entries (the stub hook returns static null values and a no-op calculate).

---

## Task 3: Implement hook — state, invalidation, consent

**Files:**

- Modify: `src/hooks/use-calculator-api.ts`

- [ ] **Step 1: Replace the stub body with the full implementation**

```typescript
// src/hooks/use-calculator-api.ts
import { useCallback, useEffect, useState } from "react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import {
  generateGrowthSeries,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";
import type { NormalizedDataset } from "@/types/domain";
import type { GlobalSettings } from "@/types/settings";
import type { VmAgentResponse } from "@/types/veeam-api";
import { callVmAgentApi } from "@/lib/veeam-api";

export interface UseCalculatorApiOptions {
  data: NormalizedDataset;
  excludedJobNames: Set<string>;
  settings: GlobalSettings;
}

export interface UseCalculatorApiResult {
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  grantConsent: () => void;
  calculate: () => Promise<void>;
}

export function useCalculatorApi({
  data,
  excludedJobNames,
  settings,
}: UseCalculatorApiOptions): UseCalculatorApiResult {
  const [result, setResult] = useState<VmAgentResponse | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<VmAgentResponse | null>(
    null,
  );
  const [growthSeries, setGrowthSeries] = useState<GrowthSeriesPoint[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  // Serialise inputs that affect the calculation. When this key changes,
  // clear all result state so the user must re-calculate for the new inputs.
  // React bails out of re-renders when setState is called with the same value,
  // so the unconditional clears on initial mount (when everything is null) are free.
  const inputKey = JSON.stringify({
    excluded: [...excludedJobNames].sort(),
    settings,
  });

  useEffect(() => {
    setResult(null);
    setUpgradeResult(null);
    setGrowthSeries(null);
    setError(null);
  }, [inputKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const grantConsent = useCallback(() => {
    setHasConsented(true);
  }, []);

  const calculate = useCallback(async () => {
    const vbrVersion = data.backupServer?.[0]?.Version ?? "";
    const isVbr12 = parseInt(vbrVersion.split(".")[0], 10) < 13;
    const activeJobCount = data.jobInfo.filter(
      (j) => !excludedJobNames.has(j.JobName),
    ).length;
    const summary = buildCalculatorSummary(
      data.jobInfo,
      data.jobSessionSummary,
      excludedJobNames,
      settings,
    );
    const growthArgs = {
      jobs: data.jobInfo,
      sessions: data.jobSessionSummary,
      excludedJobNames,
      settings,
      jobCount: activeJobCount,
      vbrVersion,
    };

    setLoading(true);
    setError(null);
    setResult(null);
    setUpgradeResult(null);
    setGrowthSeries(null);

    try {
      if (isVbr12) {
        const [v12Res, v13Res, growth] = await Promise.all([
          callVmAgentApi(
            summary,
            activeJobCount,
            vbrVersion,
            undefined,
            settings,
          ),
          callVmAgentApi(summary, activeJobCount, vbrVersion, 0, settings),
          generateGrowthSeries(growthArgs),
        ]);
        setResult(v12Res);
        setUpgradeResult(v13Res);
        setGrowthSeries(growth);
      } else {
        const [res, growth] = await Promise.all([
          callVmAgentApi(
            summary,
            activeJobCount,
            vbrVersion,
            undefined,
            settings,
          ),
          generateGrowthSeries(growthArgs),
        ]);
        setResult(res);
        setUpgradeResult(null);
        setGrowthSeries(growth);
      }
    } catch {
      setError(
        "Could not retrieve sizing estimate. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [data, excludedJobNames, settings]);

  return {
    result,
    upgradeResult,
    growthSeries,
    error,
    loading,
    hasConsented,
    grantConsent,
    calculate,
  };
}
```

- [ ] **Step 2: Run the hook tests and confirm they all pass**

```bash
npx vitest run src/__tests__/use-calculator-api.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-calculator-api.ts src/__tests__/use-calculator-api.test.ts
git commit -m "$(cat <<'EOF'
feat(calculator): add useCalculatorApi hook with result persistence and invalidation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Write new failing tests for `CalculatorInputs` controlled behavior

**Files:**

- Modify: `src/__tests__/calculator-inputs.test.tsx` — add new `describe` block at bottom

- [ ] **Step 1: Add the new controlled-behavior tests at the end of the file, before the closing `}`**

Append this block inside the outer `describe("CalculatorInputs", () => { ... })`, after all existing `describe` blocks:

```typescript
  describe("controlled consent behavior (new prop interface)", () => {
    const onConsentGiven = vi.fn();
    const onCalculate = vi.fn().mockResolvedValue(undefined);

    const baseControlledProps = {
      result: null as VmAgentResponse | null,
      upgradeResult: null as VmAgentResponse | null,
      growthSeries: null as GrowthSeriesPoint[] | null,
      error: null as string | null,
      loading: false,
      hasConsented: false,
      onConsentGiven,
      onCalculate,
    };

    beforeEach(() => {
      onConsentGiven.mockClear();
      onCalculate.mockClear();
    });

    it("shows 'Get Sizing Estimate' when result is null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={null}
        />,
      );
      expect(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      ).toBeInTheDocument();
    });

    it("shows 'Re-calculate' when result is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
        />,
      );
      expect(
        screen.getByRole("button", { name: /re-calculate/i }),
      ).toBeInTheDocument();
    });

    it("opens consent dialog when hasConsented is false and button is clicked", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          hasConsented={false}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onCalculate).not.toHaveBeenCalled();
    });

    it("calls onConsentGiven and onCalculate when consent dialog is accepted", async () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          hasConsented={false}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /accept & calculate/i }),
      );
      expect(onConsentGiven).toHaveBeenCalledTimes(1);
      expect(onCalculate).toHaveBeenCalledTimes(1);
    });

    it("does not call onCalculate when consent dialog is declined", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          hasConsented={false}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /get sizing estimate/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /decline/i }));
      expect(onCalculate).not.toHaveBeenCalled();
      expect(onConsentGiven).not.toHaveBeenCalled();
    });

    it("calls onCalculate directly without dialog when hasConsented is true", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
          hasConsented={true}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      expect(onCalculate).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not call onConsentGiven when already consented and Re-calculate is clicked", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
          hasConsented={true}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
      expect(onConsentGiven).not.toHaveBeenCalled();
    });

    it("shows SizingResults when result prop is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          result={MOCK_API_RESULT}
        />,
      );
      expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
    });

    it("shows error alert when error prop is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          error="Could not retrieve sizing estimate. Check your connection and try again."
        />,
      );
      expect(
        screen.getByText(/could not retrieve sizing/i),
      ).toBeInTheDocument();
    });

    it("shows 'Calculating…' and disables button when loading is true", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...baseControlledProps}
          loading={true}
        />,
      );
      expect(screen.getByText(/calculating/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /calculating/i })).toBeDisabled();
    });

    it("renders VBR 12 upgrade annotation when upgradeResult is non-null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr12}
          {...baseControlledProps}
          result={MOCK_V12_RESULT}
          upgradeResult={MOCK_V13_RESULT}
        />,
      );
      expect(
        screen.getByText(/upgrade to VBR 13 could reduce this to/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/__tests__/calculator-inputs.test.tsx -t "controlled consent behavior"
```

Expected: FAIL — `CalculatorInputs` does not yet accept the new controlled props.

---

## Task 5: Refactor `CalculatorInputs` to controlled props

**Files:**

- Modify: `src/components/dashboard/calculator-inputs.tsx`

- [ ] **Step 1: Replace the entire file with the refactored version**

The key changes: remove local result/loading/error/consent state; add controlled props; change button onClick to check `hasConsented`; change consent dialog `onAccept` to call `onConsentGiven` then `onCalculate`; keep `consentOpen` local.

```typescript
import { useState } from "react";
import {
  Archive,
  Calculator,
  Clock,
  Cloud,
  ExternalLink,
  Info,
  Loader2,
  RotateCcw,
  Server,
  TrendingUp,
} from "lucide-react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import {
  formatDays,
  formatGFS,
  formatPercent,
  formatTB,
} from "@/lib/format-utils";
import {
  naturalRetentionYears,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";
import type { NormalizedDataset } from "@/types/domain";
import type { VmAgentResponse } from "@/types/veeam-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MINIMUM_RETENTION_DAYS } from "@/lib/constants";
import { useSettings } from "@/hooks/use-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SizingResults } from "./sizing-results";
import { CalculatorConsentDialog } from "./calculator-consent-dialog";

interface BreakdownRow {
  key: string;
  left: string;
  right: string;
}

function BreakdownHoverCard({
  label,
  rows,
}: {
  label: string;
  rows: BreakdownRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`Show ${label} breakdown`}
          className="text-muted-foreground/70 hover:text-foreground inline-flex items-center justify-center motion-safe:transition-colors"
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-64 p-3">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          {label} breakdown
        </p>
        <ul className="divide-border/60 divide-y">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
            >
              <span className="text-foreground">{row.left}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {row.right}
              </span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

interface CalculatorInputsProps {
  data: NormalizedDataset;
  excludedJobNames?: Set<string>;
  // Controlled state (lifted to useCalculatorApi in DashboardView)
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  // Callbacks
  onConsentGiven: () => void;
  onCalculate: () => Promise<void>;
}

export function CalculatorInputs({
  data,
  excludedJobNames = new Set(),
  result,
  upgradeResult,
  growthSeries,
  error,
  loading,
  hasConsented,
  onConsentGiven,
  onCalculate,
}: CalculatorInputsProps) {
  const { settings } = useSettings();
  const [consentOpen, setConsentOpen] = useState(false);

  const summary = buildCalculatorSummary(
    data.jobInfo,
    data.jobSessionSummary,
    excludedJobNames,
    settings,
  );
  const activeJobCount = data.jobInfo.filter(
    (j) => !excludedJobNames.has(j.JobName),
  ).length;

  const vbrVersion = data.backupServer?.[0]?.Version ?? "";
  const isVbr12 = parseInt(vbrVersion.split(".")[0], 10) < 13;
  const hasSobr = (data.sobr?.length ?? 0) > 0;

  const effectiveRetentionYears =
    settings.limitCalculationYears !== null
      ? settings.limitCalculationYears +
        (settings.limitCalculationMonths ?? 0) / 12
      : naturalRetentionYears(summary);
  const cappedAtYears = effectiveRetentionYears > 12 ? 12 : undefined;

  const handleButtonClick = () => {
    if (hasConsented) {
      void onCalculate();
    } else {
      setConsentOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Calculator Inputs
            <Badge variant="outline" className="font-normal">
              Estimated
            </Badge>
          </CardTitle>
          <CardDescription>
            Aggregated values from {activeJobCount} job
            {activeJobCount !== 1 ? "s" : ""}
            {excludedJobNames.size > 0 && (
              <span className="text-warning ml-1">
                ({excludedJobNames.size} excluded)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                Source Data
                <BreakdownHoverCard
                  label="Source data"
                  rows={summary.sourceDataBreakdown.map((b) => ({
                    key: b.type,
                    left: b.type,
                    right: formatTB(b.tb),
                  }))}
                />
              </div>
              <p className="font-mono text-2xl font-semibold">
                {formatTB(summary.totalSourceDataTB)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Daily Change Rate
              </p>
              <p className="font-mono text-2xl font-semibold">
                {formatPercent(summary.weightedAvgChangeRate, 2)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Immutability Period
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold">
                  {summary.immutabilityDays} days
                </p>
                <span className="text-muted-foreground text-xs">
                  (VDC Vault minimum)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                Retention
                <BreakdownHoverCard
                  label="Retention distribution"
                  rows={summary.retentionDistribution.map((r) => ({
                    key: String(r.days),
                    left: `${r.count} job${r.count !== 1 ? "s" : ""}`,
                    right: formatDays(r.days),
                  }))}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold">
                  {formatDays(summary.maxRetentionDays)}
                </p>
                {summary.originalMaxRetentionDays !== null &&
                  summary.originalMaxRetentionDays < MINIMUM_RETENTION_DAYS && (
                    <span className="text-muted-foreground text-xs">
                      (current: {summary.originalMaxRetentionDays} days)
                    </span>
                  )}
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                Extended Retention
                <BreakdownHoverCard
                  label="GFS distribution"
                  rows={summary.gfsDistribution.map((g) => ({
                    key: g.policy,
                    left: `${g.count} job${g.count !== 1 ? "s" : ""}`,
                    right: g.policy,
                  }))}
                />
              </div>
              <p className="font-mono text-2xl font-semibold">
                {formatGFS(
                  summary.gfsWeekly,
                  summary.gfsMonthly,
                  summary.gfsYearly,
                )}
              </p>
            </div>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center gap-1.5 border-t pt-4"
            data-testid="settings-indicators"
          >
            <span className="text-muted-foreground mr-1 text-xs font-medium tracking-wider uppercase">
              Active settings
            </span>
            <Badge
              variant="outline"
              className="text-muted-foreground gap-1 text-xs font-normal"
            >
              {settings.targetCloud === "AWS" ? (
                <Server className="size-3" aria-hidden="true" />
              ) : (
                <Cloud className="size-3" aria-hidden="true" />
              )}
              Target: {settings.targetCloud}
            </Badge>
            {(settings.growthPercent > 0 || settings.growthYears > 0) && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <TrendingUp className="size-3" aria-hidden="true" />
                Growth: {settings.growthPercent}% ({settings.growthYears}y)
              </Badge>
            )}
            {settings.limitCalculationYears !== null && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <Clock className="size-3" aria-hidden="true" />
                Retention cap:{" "}
                {settings.limitCalculationYears > 0 &&
                settings.limitCalculationMonths > 0
                  ? `${settings.limitCalculationYears}y ${settings.limitCalculationMonths}m`
                  : settings.limitCalculationMonths > 0
                    ? `${settings.limitCalculationMonths}m`
                    : `${settings.limitCalculationYears}y`}
              </Badge>
            )}
            {settings.ignoreArchiveTier && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <Archive className="size-3" aria-hidden="true" />
                Simulating: Archive Tier Ignored
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={handleButtonClick}
            disabled={loading}
            className="sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2
                  className="mr-2 size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Calculating…
              </>
            ) : result ? (
              <>
                <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                Re-calculate
              </>
            ) : (
              <>
                <Calculator className="mr-2 size-4" aria-hidden="true" />
                Get Sizing Estimate
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://www.veeam.com/calculators/simple/vdc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground"
            >
              <ExternalLink className="mr-1 size-3" aria-hidden="true" />
              Advanced calculator
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <SizingResults
          result={result}
          upgradeResult={upgradeResult ?? undefined}
          sobrBlocksUpgrade={isVbr12 && hasSobr}
          growthSeries={growthSeries}
          greenfieldSimulation={settings.greenfieldSimulation}
          historicalDataYears={settings.historicalDataYears}
          cappedAtYears={cappedAtYears}
        />
      )}

      <CalculatorConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={() => {
          onConsentGiven();
          void onCalculate();
        }}
        onDecline={() => {}}
        summary={summary}
        activeJobCount={activeJobCount}
        vbrVersion={vbrVersion}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run the new controlled-behavior tests to confirm they pass**

```bash
npx vitest run src/__tests__/calculator-inputs.test.tsx -t "controlled consent behavior"
```

Expected: all new tests PASS.

- [ ] **Step 3: Run the full calculator-inputs test suite to see which tests now fail**

```bash
npx vitest run src/__tests__/calculator-inputs.test.tsx
```

Expected: existing tests fail because they render `<CalculatorInputs data={mockData} />` without the new required props (`result`, `error`, `loading`, `hasConsented`, `onConsentGiven`, `onCalculate`). TypeScript errors may also appear. Note which tests need updating before proceeding.

---

## Task 6: Fix existing `calculator-inputs.test.tsx` tests for new interface

**Files:**

- Modify: `src/__tests__/calculator-inputs.test.tsx`

**Context:** The new `CalculatorInputs` requires controlled props. Most existing tests only test display logic (aggregated values, retention labels, settings badges) and just need the new props added. The tests that previously tested the full API-call flow (consent dialog → API call → display result) must be rewritten: the display-only assertions now pass result/upgradeResult as props, and the API-call behavior is tested in `use-calculator-api.test.ts`.

- [ ] **Step 1: Add a shared `defaultControlledProps` constant at the top of the describe block**

After the `beforeEach` and before the first `it(` in the outer `describe("CalculatorInputs", ...)`, add:

```typescript
// Controlled props required by the new interface. Tests that only check
// display logic spread this to avoid repetition.
const defaultControlledProps = {
  result: null as VmAgentResponse | null,
  upgradeResult: null as VmAgentResponse | null,
  growthSeries: null as GrowthSeriesPoint[] | null,
  error: null as string | null,
  loading: false,
  hasConsented: false,
  onConsentGiven: vi.fn(),
  onCalculate: vi.fn().mockResolvedValue(undefined),
};
```

Also add this import at the top of the file (after existing imports):

```typescript
import type { GrowthSeriesPoint } from "@/lib/growth-projector";
```

- [ ] **Step 2: Update all `render(<CalculatorInputs .../>)` calls that don't pass controlled props**

For every `render` call that uses `data={mockData}`, `data={mockDataVbr12}`, or `data={mockDataVbr13}` without the new required props, spread `{...defaultControlledProps}` after the `data` prop.

Pattern:

```typescript
// Before
render(<CalculatorInputs data={mockData} />);

// After
render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
```

```typescript
// Before
render(<CalculatorInputs data={mockData} excludedJobNames={excluded} />);

// After
render(
  <CalculatorInputs
    data={mockData}
    excludedJobNames={excluded}
    {...defaultControlledProps}
  />,
);
```

Apply this pattern to every `render` call in the existing tests (excluding the new `describe("controlled consent behavior")` block you added in Task 4, which already has explicit props).

- [ ] **Step 3: Rewrite the tests that tested the full API-call flow**

These tests previously verified that clicking the consent dialog triggered API calls and showed results. Replace each one with a prop-driven equivalent:

**Replace** `"shows sizing results after accepting consent dialog"`:

```typescript
  it("shows sizing results when result prop is provided", () => {
    render(
      <CalculatorInputs
        data={mockData}
        {...defaultControlledProps}
        result={MOCK_API_RESULT}
      />,
    );
    expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
  });
```

**Replace** `"shows error message on API failure after accepting consent"`:

```typescript
  it("shows error message when error prop is provided", () => {
    render(
      <CalculatorInputs
        data={mockData}
        {...defaultControlledProps}
        error="Could not retrieve sizing estimate. Check your connection and try again."
      />,
    );
    expect(
      screen.getByText(/could not retrieve sizing/i),
    ).toBeInTheDocument();
  });
```

**Replace** the entire `describe("VBR upgrade savings comparison")` block:

```typescript
  describe("VBR upgrade savings comparison", () => {
    it("renders inline upgrade annotation when result and upgradeResult are provided for VBR 12", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr12}
          {...defaultControlledProps}
          result={MOCK_V12_RESULT}
          upgradeResult={MOCK_V13_RESULT}
        />,
      );
      expect(
        screen.getByText(/upgrade to VBR 13 could reduce this to/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/saving 2\.50 TB/i)).toBeInTheDocument();
    });

    it("does NOT render UpgradeSavings for VBR 13 (upgradeResult is null)", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
          upgradeResult={null}
        />,
      );
      expect(screen.getByText(/12\.50 TB/)).toBeInTheDocument();
      expect(
        screen.queryByText(/VBR 12 to VBR 13/i),
      ).not.toBeInTheDocument();
    });

    it("renders SOBR-aware upgrade copy for VBR 12 with SOBRs", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr12WithSobr}
          {...defaultControlledProps}
          result={MOCK_V12_RESULT}
          upgradeResult={MOCK_V13_RESULT}
        />,
      );
      expect(screen.getByText(/Potentially save/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /by upgrading to VBR 13 and transitioning SOBRs to direct Backup Copy jobs\./i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
    });

    it("does NOT render legacy SOBR-blocks-upgrade note for VBR 13", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
        />,
      );
      expect(
        screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
      ).not.toBeInTheDocument();
    });
  });
```

**Replace** the entire `describe("growth series integration")` block:

```typescript
  describe("growth series display", () => {
    it("renders the growth chart card when growthSeries prop is provided", () => {
      const growthSeries = [
        {
          name: "Year 1",
          daily: 1,
          weekly: 0.5,
          monthly: 0.5,
          yearly: 0.25,
          immutability: 0.1,
          total: 2.35,
        },
      ];
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
          growthSeries={growthSeries}
        />,
      );
      expect(
        screen.getByText(/projected storage growth/i),
      ).toBeInTheDocument();
    });

    it("does not render growth chart when growthSeries prop is null", () => {
      render(
        <CalculatorInputs
          data={mockDataVbr13}
          {...defaultControlledProps}
          result={MOCK_API_RESULT}
          growthSeries={null}
        />,
      );
      // Growth chart heading absent when growthSeries is null.
      // SizingResults renders it only when the prop is provided.
      expect(
        screen.queryByText(/projected storage growth/i),
      ).not.toBeInTheDocument();
    });
  });
```

**Delete** the test `"resets upgrade result when re-calculating"` — this behavior is covered by `use-calculator-api.test.ts` (`"clears previous result and error before a new calculate() call"`).

**Delete** the tests:

- `"does not call API when Decline is clicked"` (replaced by controlled consent behavior tests)
- `"calls generateGrowthSeries when the user accepts the consent dialog"` (hook test)
- `"does NOT call generateGrowthSeries on settings change alone"` (hook test)
- `"fires the sizing call and the growth series concurrently (Promise.all)"` (hook test)
- `"fires v12 sizing + v13 sizing + growth series concurrently for VBR 12 + no SOBR"` (hook test)
- `"propagates a growth-series rejection through the existing error path"` (hook test)
- `"makes two API calls for VBR 12 + no SOBRs"` (hook test)
- `"does NOT render any upgrade copy for VBR 12 without SOBRs when SOBR copy would be wrong"` (same behavior covered by the new VBR upgrade comparison test above)
- `"makes two API calls and renders SOBR-aware copy for VBR 12 with SOBRs"` (API count verified in hook test; display verified above)
- `"does NOT render the legacy SOBR-blocks-upgrade note for VBR 13"` (merged into updated block above)

- [ ] **Step 4: Run the full calculator-inputs test suite and confirm all tests pass**

```bash
npx vitest run src/__tests__/calculator-inputs.test.tsx
```

Expected: all tests PASS. If TypeScript errors appear, run `npx tsc --noEmit` to find them.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/calculator-inputs.tsx src/__tests__/calculator-inputs.test.tsx
git commit -m "$(cat <<'EOF'
refactor(calculator): convert CalculatorInputs to controlled props interface

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wire `DashboardView` with `useSettings` and `useCalculatorApi`

**Files:**

- Modify: `src/components/dashboard/dashboard-view.tsx`

- [ ] **Step 1: Add the imports for the new hook and `useSettings`**

At the top of `src/components/dashboard/dashboard-view.tsx`, add these imports alongside the existing ones:

```typescript
import { useSettings } from "@/hooks/use-settings";
import { useCalculatorApi } from "@/hooks/use-calculator-api";
```

- [ ] **Step 2: Call `useSettings` and `useCalculatorApi` inside `DashboardView`**

Inside the `DashboardView` function body, after the existing state declarations (after `const [excludedJobNames, setExcludedJobNames] = useState...`), add:

```typescript
const { settings } = useSettings();
const {
  result: calcResult,
  upgradeResult: calcUpgradeResult,
  growthSeries: calcGrowthSeries,
  error: calcError,
  loading: calcLoading,
  hasConsented,
  grantConsent,
  calculate,
} = useCalculatorApi({ data, excludedJobNames, settings });
```

- [ ] **Step 3: Pass the controlled props to `CalculatorInputs`**

Find the `<CalculatorInputs ...>` usage in the sizing `TabsContent` and update it:

```typescript
// Before
<CalculatorInputs data={data} excludedJobNames={excludedJobNames} />

// After
<CalculatorInputs
  data={data}
  excludedJobNames={excludedJobNames}
  result={calcResult}
  upgradeResult={calcUpgradeResult}
  growthSeries={calcGrowthSeries}
  error={calcError}
  loading={calcLoading}
  hasConsented={hasConsented}
  onConsentGiven={grantConsent}
  onCalculate={calculate}
/>
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests PASS. If `dashboard-view.test.tsx` fails, it is likely because it renders `DashboardView` without the mock for `useCalculatorApi`. Check the failure and add a mock if needed:

```typescript
// If needed in dashboard-view.test.tsx:
vi.mock("@/hooks/use-calculator-api", () => ({
  useCalculatorApi: vi.fn(() => ({
    result: null,
    upgradeResult: null,
    growthSeries: null,
    error: null,
    loading: false,
    hasConsented: false,
    grantConsent: vi.fn(),
    calculate: vi.fn().mockResolvedValue(undefined),
  })),
}));
```

- [ ] **Step 6: Run the build to confirm no compile-time errors**

```bash
npm run build
```

Expected: build succeeds with no TypeScript or Vite errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/dashboard-view.tsx
git commit -m "$(cat <<'EOF'
fix(sizing): persist calculator results across tab navigation

Results now survive tab switches because useCalculatorApi lives above
the Radix UI TabsContent that unmounts CalculatorInputs on tab change.
Results clear automatically when excluded jobs or settings change.
Consent is remembered for the page session.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the full test suite one final time**

```bash
npm run test:run
```

Expected: all tests PASS with no failures.

- [ ] **Step 2: Run the linter**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 3: Run the build**

```bash
npm run build
```

Expected: build succeeds.
