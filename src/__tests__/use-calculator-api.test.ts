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

const MOCK_UPGRADE_RESULT: VmAgentResponse = {
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

const mockDataNoServer = {
  jobInfo: [],
  jobSessionSummary: [],
  backupServer: [],
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
        await result.current.calculate(30);
      });

      expect(result.current.result).toEqual(MOCK_API_RESULT);

      rerender(baseProps);

      expect(result.current.result).toEqual(MOCK_API_RESULT);
    });

    it("persists growthSeries when re-rendered with identical inputs", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(30);
      });

      expect(result.current.growthSeries).toEqual(SAMPLE_GROWTH);

      rerender(baseProps);

      expect(result.current.growthSeries).toEqual(SAMPLE_GROWTH);
    });
  });

  describe("invalidation", () => {
    it("clears result when excludedJobNames changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(30);
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
        await result.current.calculate(30);
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
        await result.current.calculate(30);
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
        await result.current.calculate(30);
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      expect(result.current.error).toBeNull();
    });

    it("ignores in-flight result if inputs change before it resolves", async () => {
      let resolveApi!: (v: VmAgentResponse) => void;
      vi.mocked(callVmAgentApi).mockImplementationOnce(
        () =>
          new Promise<VmAgentResponse>((resolve) => {
            resolveApi = resolve;
          }),
      );

      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      // Start calculate but don't await it yet
      act(() => {
        void result.current.calculate(30);
      });

      // Change inputs while calculate is in flight — this should cancel the in-flight call
      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      // Resolve the original API call
      await act(async () => {
        resolveApi(MOCK_API_RESULT);
      });

      // Stale result should NOT have been written
      expect(result.current.result).toBeNull();
      // loading must also be cleared — stale finally cannot leave it stuck
      expect(result.current.loading).toBe(false);
    });

    it("clears loading immediately when inputs change mid-flight (no re-calculate)", async () => {
      let resolveApi!: (v: VmAgentResponse) => void;
      vi.mocked(callVmAgentApi).mockImplementationOnce(
        () =>
          new Promise<VmAgentResponse>((resolve) => {
            resolveApi = resolve;
          }),
      );

      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      act(() => {
        void result.current.calculate(30);
      });
      expect(result.current.loading).toBe(true);

      // Change inputs without calling calculate() again
      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      // Invalidation effect must clear loading without waiting for the old request
      expect(result.current.loading).toBe(false);

      // Resolve the stale request so it doesn't leak
      await act(async () => {
        resolveApi(MOCK_API_RESULT);
      });
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

      let calculatePromise!: Promise<void>;
      act(() => {
        calculatePromise = result.current.calculate(30);
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
        await result.current.calculate(30);
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        { ...DEFAULT_SUMMARY, immutabilityDays: 30 },
        0,
        "13.0.1.1071",
        undefined,
        DEFAULT_SETTINGS,
      );
      expect(result.current.result).toEqual(MOCK_API_RESULT);
      expect(result.current.upgradeResult).toBeNull();
    });

    it("calls callVmAgentApi once when backupServer is empty (unknown version, not VBR 12)", async () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataNoServer }),
      );

      await act(async () => {
        await result.current.calculate(30);
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      expect(result.current.upgradeResult).toBeNull();
    });

    it("calls callVmAgentApi twice for VBR 12 (v12 + v13 comparison)", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(30);
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(2);
      expect(result.current.result).toEqual(MOCK_V12_RESULT);
      expect(result.current.upgradeResult).toEqual(MOCK_UPGRADE_RESULT);
    });

    it("calls generateGrowthSeries for VBR 13", async () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr13 }),
      );

      await act(async () => {
        await result.current.calculate(30);
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
      expect(result.current.growthSeries).toEqual(SAMPLE_GROWTH);
    });

    it("sets error and clears result on API failure", async () => {
      vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("Network"));

      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate(30);
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
        await result.current.calculate(30);
      });
      expect(result.current.error).not.toBeNull();

      await act(async () => {
        await result.current.calculate(30);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toEqual(MOCK_API_RESULT);
    });

    it("patches summary with the provided immutabilityDays before calling callVmAgentApi", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate(14);
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        { ...DEFAULT_SUMMARY, immutabilityDays: 14 },
        expect.any(Number),
        expect.any(String),
        undefined,
        DEFAULT_SETTINGS,
      );
    });
  });
});
