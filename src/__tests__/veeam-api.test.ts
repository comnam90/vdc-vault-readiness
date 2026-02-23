import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CalculatorSummary } from "@/types/calculator";
import { buildVmAgentRequest, callVmAgentApi } from "@/lib/veeam-api";
import type { VmAgentResponse } from "@/types/veeam-api";

const MOCK_SUMMARY: CalculatorSummary = {
  totalSourceDataTB: 5.0,
  weightedAvgChangeRate: 8.0,
  immutabilityDays: 30,
  maxRetentionDays: 30,
  originalMaxRetentionDays: 14,
  gfsWeekly: 4,
  gfsMonthly: 12,
  gfsYearly: 1,
};

const MOCK_RESPONSE: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: {
      compute: {
        cores: 8,
        ram: 16,
        volumes: [{ diskGB: 13500, diskPurpose: 3 }],
      },
    },
    transactions: {},
    performanceTierImmutabilityTaxGB: 250,
    capacityTierImmutabilityTaxGB: 0,
  },
};

describe("buildVmAgentRequest", () => {
  it("maps summary fields to request payload", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 30);
    expect(req.sourceTB).toBe(5.0);
    expect(req.ChangeRate).toBe(8.0);
    expect(req.days).toBe(30);
    expect(req.Weeklies).toBe(4);
    expect(req.Monthlies).toBe(12);
    expect(req.Yearlies).toBe(1);
    expect(req.instanceCount).toBe(30);
  });

  it("uses hardcoded defaults", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10);
    expect(req.Reduction).toBe(50);
    expect(req.backupWindowHours).toBe(8);
    expect(req.GrowthRatePercent).toBe(5);
    expect(req.GrowthRateScopeYears).toBe(1);
    expect(req.immutablePerf).toBe(true);
    expect(req.immutablePerfDays).toBe(30);
    expect(req.isCapTierVDCV).toBe(true);
    expect(req.ObjectStorage).toBe(true);
    expect(req.productVersion).toBe(0);
  });

  it("falls back to 0 for null summary fields", () => {
    const nullSummary: CalculatorSummary = {
      ...MOCK_SUMMARY,
      totalSourceDataTB: null,
      weightedAvgChangeRate: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    const req = buildVmAgentRequest(nullSummary, 10);
    expect(req.sourceTB).toBe(0);
    expect(req.ChangeRate).toBe(0);
    expect(req.Weeklies).toBe(0);
  });
});

describe("callVmAgentApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the Veeam calculator API and returns parsed response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 }),
    );
    const result = await callVmAgentApi(MOCK_SUMMARY, 30);
    expect(result.success).toBe(true);
    expect(result.data.totalStorageTB).toBe(12.5);
    expect(fetch).toHaveBeenCalledWith(
      "/api/veeam-proxy",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws when the API returns a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Bad Request", { status: 400 }),
    );
    await expect(callVmAgentApi(MOCK_SUMMARY, 5)).rejects.toThrow();
  });
});
