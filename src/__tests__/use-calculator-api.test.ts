// src/__tests__/use-calculator-api.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCalculatorApi,
  type UseCalculatorApiOptions,
  type CalculatorOverrides,
} from "@/hooks/use-calculator-api";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type { NormalizedDataset } from "@/types/domain";
import type { VmAgentResponse } from "@/types/veeam-api";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

vi.mock("@/lib/calculator-aggregator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/calculator-aggregator")>();
  return { ...actual, buildCalculatorSummary: vi.fn() };
});

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
    buffer: 0,
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
  immutabilityDays: 30,
  retentionDays: 14,
  gfsWeekly: 1,
  gfsMonthly: 1,
  gfsYearly: 1,
};

const DEFAULT_OVERRIDES: CalculatorOverrides = {
  immutabilityDays: 30,
  retentionDays: DEFAULT_SUMMARY.maxRetentionDays ?? 30,
  gfsWeekly: DEFAULT_SUMMARY.gfsWeekly,
  gfsMonthly: DEFAULT_SUMMARY.gfsMonthly,
  gfsYearly: DEFAULT_SUMMARY.gfsYearly,
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
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, excludedJobNames: new Set(["Job A"]) });
      });

      expect(result.current.error).toBeNull();
    });

    it("clears result when immutabilityDays changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, immutabilityDays: 60 });
      });

      expect(result.current.result).toBeNull();
    });

    it("clears result when retentionDays changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, retentionDays: 90 });
      });

      expect(result.current.result).toBeNull();
    });

    it("clears result when gfsWeekly changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, gfsWeekly: 4 });
      });

      expect(result.current.result).toBeNull();
    });

    it("clears result when gfsMonthly changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, gfsMonthly: 24 });
      });

      expect(result.current.result).toBeNull();
    });

    it("clears result when gfsYearly changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();

      act(() => {
        rerender({ ...baseProps, gfsYearly: 10 });
      });

      expect(result.current.result).toBeNull();
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
        void result.current.calculate(DEFAULT_OVERRIDES);
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
        void result.current.calculate(DEFAULT_OVERRIDES);
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

    it("does NOT clear result or growthSeries when only bufferEnabled changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();
      expect(result.current.growthSeries).not.toBeNull();

      act(() => {
        rerender({
          ...baseProps,
          settings: { ...DEFAULT_SETTINGS, bufferEnabled: true },
        });
      });

      expect(result.current.result).not.toBeNull();
      expect(result.current.growthSeries).not.toBeNull();
    });

    it("does NOT clear result or growthSeries when only bufferPercent changes", async () => {
      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: baseProps },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.result).not.toBeNull();
      expect(result.current.growthSeries).not.toBeNull();

      act(() => {
        rerender({
          ...baseProps,
          settings: { ...DEFAULT_SETTINGS, bufferPercent: 25 },
        });
      });

      expect(result.current.result).not.toBeNull();
      expect(result.current.growthSeries).not.toBeNull();
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
        calculatePromise = result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledTimes(1);
      // patchedSummary with DEFAULT_OVERRIDES equals DEFAULT_SUMMARY
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

    it("calls callVmAgentApi once when backupServer is empty (unknown version, not VBR 12)", async () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataNoServer }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
      expect(result.current.growthSeries).toEqual(SAMPLE_GROWTH);
    });

    it("sets error and clears result on API failure", async () => {
      vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("Network"));

      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
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
        await result.current.calculate(DEFAULT_OVERRIDES);
      });
      expect(result.current.error).not.toBeNull();

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toEqual(MOCK_API_RESULT);
    });

    it("patches summary with the provided immutabilityDays before calling callVmAgentApi", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          immutabilityDays: 14,
        });
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        { ...DEFAULT_SUMMARY, immutabilityDays: 14 },
        expect.any(Number),
        expect.any(String),
        undefined,
        DEFAULT_SETTINGS,
      );
    });

    it("forwards immutabilityDays to generateGrowthSeries", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          immutabilityDays: 14,
        });
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledWith(
        expect.objectContaining({ immutabilityDays: 14 }),
      );
    });

    it("patches patchedSummary with retentionDays overriding both maxRetentionDays and originalMaxRetentionDays", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          retentionDays: 60,
        });
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetentionDays: 60,
          originalMaxRetentionDays: 60,
        }),
        expect.any(Number),
        expect.any(String),
        undefined,
        DEFAULT_SETTINGS,
      );
    });

    it("patches patchedSummary with GFS overrides", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          gfsWeekly: 4,
          gfsMonthly: 12,
          gfsYearly: 7,
        });
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        expect.objectContaining({ gfsWeekly: 4, gfsMonthly: 12, gfsYearly: 7 }),
        expect.any(Number),
        expect.any(String),
        undefined,
        DEFAULT_SETTINGS,
      );
    });

    it("caps GFS overrides to limitCalculationYears before sending to the API", async () => {
      // cap=1y → yearly max=floor(365/365)=1 (clamps 5→1); monthly=floor(365/30)=12
      // (stays 12); weekly=floor(365/7)=52 (stays 4). Only yearly must change.
      const cappedSettings = { ...DEFAULT_SETTINGS, limitCalculationYears: 1 };
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, settings: cappedSettings }),
      );

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          gfsWeekly: 4,
          gfsMonthly: 12,
          gfsYearly: 5,
        });
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        expect.objectContaining({ gfsWeekly: 4, gfsMonthly: 12, gfsYearly: 1 }),
        expect.any(Number),
        expect.any(String),
        undefined,
        cappedSettings,
      );
    });

    it("caps retentionDays to limitCalculationYears before sending to the API", async () => {
      // cap=1y → 365 days; retentionDays=400 clamps to 365; no-cap path unaffected
      const cappedSettings = { ...DEFAULT_SETTINGS, limitCalculationYears: 1 };
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, settings: cappedSettings }),
      );

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          retentionDays: 400,
        });
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetentionDays: 365,
          originalMaxRetentionDays: 365,
        }),
        expect.any(Number),
        expect.any(String),
        undefined,
        cappedSettings,
      );
    });

    it("does not cap retentionDays when limitCalculationYears is null (no-cap path)", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          retentionDays: 400,
        });
      });

      expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetentionDays: 400,
          originalMaxRetentionDays: 400,
        }),
        expect.any(Number),
        expect.any(String),
        undefined,
        DEFAULT_SETTINGS,
      );
    });

    it("forwards retentionDays and GFS overrides to generateGrowthSeries", async () => {
      const { result } = renderHook(() => useCalculatorApi(baseProps));

      await act(async () => {
        await result.current.calculate({
          ...DEFAULT_OVERRIDES,
          retentionDays: 60,
          gfsWeekly: 4,
          gfsMonthly: 12,
          gfsYearly: 7,
        });
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledWith(
        expect.objectContaining({
          retentionDays: 60,
          gfsWeekly: 4,
          gfsMonthly: 12,
          gfsYearly: 7,
        }),
      );
    });
  });

  describe("generateUpgradeGrowth()", () => {
    it("starts with upgradeGrowthSeries null and upgradeGrowthLoading false", () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );
      expect(result.current.upgradeGrowthSeries).toBeNull();
      expect(result.current.upgradeGrowthLoading).toBe(false);
      expect(result.current.upgradeGrowthError).toBeNull();
    });

    it("calls generateGrowthSeries with productVersionOverride: 0 and sets upgradeGrowthSeries", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      vi.mocked(generateGrowthSeries).mockClear();
      vi.mocked(generateGrowthSeries).mockResolvedValue(SAMPLE_GROWTH);

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledWith(
        expect.objectContaining({ productVersionOverride: 0 }),
      );
      expect(result.current.upgradeGrowthSeries).toEqual(SAMPLE_GROWTH);
      expect(result.current.upgradeGrowthLoading).toBe(false);
      expect(result.current.upgradeGrowthError).toBeNull();
    });

    it("is idempotent: second call does not re-invoke generateGrowthSeries", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      vi.mocked(generateGrowthSeries).mockClear();
      vi.mocked(generateGrowthSeries).mockResolvedValue(SAMPLE_GROWTH);

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });
      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(vi.mocked(generateGrowthSeries)).toHaveBeenCalledTimes(1);
    });

    it("sets upgradeGrowthLoading true during fetch, false after", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      let resolveGrowth!: (v: typeof SAMPLE_GROWTH) => void;
      vi.mocked(generateGrowthSeries)
        .mockResolvedValueOnce(SAMPLE_GROWTH) // v12 growth during calculate()
        .mockImplementationOnce(
          () =>
            new Promise<typeof SAMPLE_GROWTH>((resolve) => {
              resolveGrowth = resolve;
            }),
        );

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      let growthPromise!: Promise<void>;
      act(() => {
        growthPromise = result.current.generateUpgradeGrowth();
      });

      expect(result.current.upgradeGrowthLoading).toBe(true);

      await act(async () => {
        resolveGrowth(SAMPLE_GROWTH);
        await growthPromise;
      });

      expect(result.current.upgradeGrowthLoading).toBe(false);
    });

    it("sets upgradeGrowthError on failure and leaves series null", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      vi.mocked(generateGrowthSeries).mockRejectedValueOnce(
        new Error("network"),
      );

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(result.current.upgradeGrowthSeries).toBeNull();
      expect(result.current.upgradeGrowthError).toMatch(
        /could not retrieve sizing estimate/i,
      );
      expect(result.current.upgradeGrowthLoading).toBe(false);
    });

    it("allows retry after failure (not idempotent when series is null)", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      vi.mocked(generateGrowthSeries).mockRejectedValueOnce(new Error("fail"));

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(result.current.upgradeGrowthSeries).toBeNull();

      vi.mocked(generateGrowthSeries).mockResolvedValueOnce(SAMPLE_GROWTH);

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(result.current.upgradeGrowthSeries).toEqual(SAMPLE_GROWTH);
    });

    it("clears upgradeGrowthSeries, loading, and error when inputKey changes", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: { ...baseProps, data: mockDataVbr12 } },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      vi.mocked(generateGrowthSeries).mockResolvedValueOnce(SAMPLE_GROWTH);

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(result.current.upgradeGrowthSeries).toEqual(SAMPLE_GROWTH);

      act(() => {
        rerender({
          ...baseProps,
          data: mockDataVbr12,
          excludedJobNames: new Set(["Job A"]),
        });
      });

      expect(result.current.upgradeGrowthSeries).toBeNull();
      expect(result.current.upgradeGrowthLoading).toBe(false);
      expect(result.current.upgradeGrowthError).toBeNull();
    });

    it("no-ops when called before calculate() has run (no stored overrides)", async () => {
      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      vi.mocked(generateGrowthSeries).mockClear();

      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(vi.mocked(generateGrowthSeries)).not.toHaveBeenCalled();
      expect(result.current.upgradeGrowthSeries).toBeNull();
    });

    it("does not leave upgradeGrowthLoading stuck when calculate() fires concurrently", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      let resolveUpgradeGrowth!: (v: typeof SAMPLE_GROWTH) => void;
      vi.mocked(generateGrowthSeries)
        .mockResolvedValueOnce(SAMPLE_GROWTH) // v12 growth during first calculate()
        .mockImplementationOnce(
          () =>
            new Promise<typeof SAMPLE_GROWTH>((resolve) => {
              resolveUpgradeGrowth = resolve;
            }),
        ) // generateUpgradeGrowth() — hangs
        .mockResolvedValueOnce(SAMPLE_GROWTH); // growth during second calculate()

      const { result } = renderHook(() =>
        useCalculatorApi({ ...baseProps, data: mockDataVbr12 }),
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      // Start the upgrade growth fetch (hangs)
      let upgradeGrowthPromise!: Promise<void>;
      act(() => {
        upgradeGrowthPromise = result.current.generateUpgradeGrowth();
      });
      expect(result.current.upgradeGrowthLoading).toBe(true);

      // Fire a concurrent calculate() — bumps requestIdRef
      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      // Resolve the hung fetch
      await act(async () => {
        resolveUpgradeGrowth(SAMPLE_GROWTH);
        await upgradeGrowthPromise;
      });

      // Key: loading must reset to false (not permanently stuck)
      expect(result.current.upgradeGrowthLoading).toBe(false);
    });

    it("no-ops after inputKey changes before re-running calculate (stale overrides are cleared)", async () => {
      vi.mocked(callVmAgentApi)
        .mockResolvedValueOnce(MOCK_V12_RESULT)
        .mockResolvedValueOnce(MOCK_UPGRADE_RESULT);

      const { result, rerender } = renderHook(
        (props: UseCalculatorApiOptions) => useCalculatorApi(props),
        { initialProps: { ...baseProps, data: mockDataVbr12 } },
      );

      await act(async () => {
        await result.current.calculate(DEFAULT_OVERRIDES);
      });

      // Change inputKey — new excluded job set
      act(() => {
        rerender({
          ...baseProps,
          data: mockDataVbr12,
          excludedJobNames: new Set(["Job A"]),
        });
      });

      vi.mocked(generateGrowthSeries).mockClear();

      // Call without re-running calculate — stale overrides should prevent the fetch
      await act(async () => {
        await result.current.generateUpgradeGrowth();
      });

      expect(vi.mocked(generateGrowthSeries)).not.toHaveBeenCalled();
      expect(result.current.upgradeGrowthSeries).toBeNull();
    });
  });
});
