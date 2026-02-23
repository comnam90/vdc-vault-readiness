import type { CalculatorSummary } from "@/types/calculator";
import type { VmAgentRequest, VmAgentResponse } from "@/types/veeam-api";

const API_URL = "/api/veeam-proxy";

export function buildVmAgentRequest(
  summary: CalculatorSummary,
  jobCount: number,
): VmAgentRequest {
  return {
    sourceTB: summary.totalSourceDataTB ?? 0,
    ChangeRate: summary.weightedAvgChangeRate ?? 0,
    Reduction: 50,
    backupWindowHours: 8,
    GrowthRatePercent: 5,
    GrowthRateScopeYears: 1,
    days: summary.maxRetentionDays ?? 30,
    Weeklies: summary.gfsWeekly ?? 0,
    Monthlies: summary.gfsMonthly ?? 0,
    Yearlies: summary.gfsYearly ?? 0,
    Blockcloning: false,
    ObjectStorage: true,
    moveCapacityTierEnabled: false,
    immutablePerf: true,
    immutablePerfDays: 30,
    isCapTierVDCV: true,
    productVersion: 0,
    instanceCount: jobCount,
  };
}

export async function callVmAgentApi(
  summary: CalculatorSummary,
  jobCount: number,
): Promise<VmAgentResponse> {
  const payload = buildVmAgentRequest(summary, jobCount);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Veeam API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<VmAgentResponse>;
}
