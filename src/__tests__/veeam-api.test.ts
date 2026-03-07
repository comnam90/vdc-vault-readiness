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
    const req = buildVmAgentRequest(MOCK_SUMMARY, 30, "13.0.1.1071");
    expect(req.sourceTB).toBe(5.0);
    expect(req.ChangeRate).toBe(8.0);
    expect(req.days).toBe(30);
    expect(req.Weeklies).toBe(4);
    expect(req.Monthlies).toBe(12);
    expect(req.Yearlies).toBe(1);
    expect(req.instanceCount).toBe(30);
  });

  it("uses hardcoded defaults", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "13.0.1.1071");
    expect(req.Reduction).toBe(50);
    expect(req.backupWindowHours).toBe(8);
    expect(req.GrowthRatePercent).toBe(5);
    expect(req.GrowthRateScopeYears).toBe(1);
    expect(req.blockGenerationDays).toBe(10);
    expect(req.Blockcloning).toBe(true);
    expect(req.ObjectStorage).toBe(true);
    expect(req.immutablePerf).toBe(true);
    expect(req.immutablePerfDays).toBe(30);
    expect(req.immutableCap).toBe(true);
    expect(req.immutableCapDays).toBe(30);
    expect(req.isCapTierVDCV).toBe(true);
    expect(req.isManaged).toBe(true);
    expect(req.productVersion).toBe(0);
  });

  it("sets productVersion=0 for VBR 13+", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "13.0.1.1071");
    expect(req.productVersion).toBe(0);
  });

  it("sets productVersion=-1 for VBR 12.x", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "12.1.2.456");
    expect(req.productVersion).toBe(-1);
  });

  it("uses productVersionOverride when provided", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "12.1.2.456", 0);
    expect(req.productVersion).toBe(0);
  });

  it("productVersionOverride=0 on VBR 13 still uses override", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "13.0.1.1071", 0);
    expect(req.productVersion).toBe(0);
  });

  it("productVersionOverride=-1 on VBR 13 forces legacy version", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "13.0.1.1071", -1);
    expect(req.productVersion).toBe(-1);
  });

  it("builds retention object from summary", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10, "13.0.1.1071");
    expect(req.retention.days).toBe(14); // originalMaxRetentionDays
    expect(req.retention.gfs.isDefined).toBe(true);
    expect(req.retention.gfs.weeks).toBe(4);
    expect(req.retention.gfs.months).toBe(12);
    expect(req.retention.gfs.years).toBe(1);
    expect(req.retention.isGfsDefined).toBe(true);
  });

  it("sets isGfsDefined=false when no GFS configured", () => {
    const noGfsSummary: CalculatorSummary = {
      ...MOCK_SUMMARY,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    const req = buildVmAgentRequest(noGfsSummary, 10, "13.0.1.1071");
    expect(req.retention.gfs.isDefined).toBe(false);
    expect(req.retention.isGfsDefined).toBe(false);
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
    const req = buildVmAgentRequest(nullSummary, 10, "13.0.1.1071");
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
    const result = await callVmAgentApi(MOCK_SUMMARY, 30, "13.0.1.1071");
    expect(result.success).toBe(true);
    expect(result.data.totalStorageTB).toBe(12.5);
    expect(fetch).toHaveBeenCalledWith(
      "/api/veeam-proxy",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("passes productVersionOverride through to the request payload", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 }),
    );
    await callVmAgentApi(MOCK_SUMMARY, 10, "12.1.2.456", 0);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as {
      productVersion: number;
    };
    expect(body.productVersion).toBe(0);
  });

  it("throws when the API returns a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Bad Request", { status: 400 }),
    );
    await expect(
      callVmAgentApi(MOCK_SUMMARY, 5, "13.0.1.1071"),
    ).rejects.toThrow();
  });
});
