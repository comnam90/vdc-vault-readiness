import type { CalculatorSummary } from "@/types/calculator";
import type { VmAgentRequest, VmAgentResponse } from "@/types/veeam-api";

const API_URL = "/api/veeam-proxy";

export function buildVmAgentRequest(
  summary: CalculatorSummary,
  jobCount: number,
): VmAgentRequest {
  const weeklies = summary.gfsWeekly ?? 0;
  const monthlies = summary.gfsMonthly ?? 0;
  const yearlies = summary.gfsYearly ?? 0;
  const hasGfs = weeklies > 0 || monthlies > 0 || yearlies > 0;
  const shortTermDays = summary.originalMaxRetentionDays ?? 14;

  return {
    sourceTB: summary.totalSourceDataTB ?? 0,
    ChangeRate: summary.weightedAvgChangeRate ?? 0,
    Reduction: 50,
    backupWindowHours: 8,
    GrowthRatePercent: 5,
    GrowthRateScopeYears: 1,
    blockGenerationDays: 10,
    retention: {
      days: shortTermDays,
      gfs: {
        isDefined: hasGfs,
        weeks: weeklies,
        months: monthlies,
        years: yearlies,
      },
      isGfsDefined: hasGfs,
    },
    days: summary.maxRetentionDays ?? 30,
    Weeklies: weeklies,
    Monthlies: monthlies,
    Yearlies: yearlies,
    Blockcloning: true,
    ObjectStorage: true,
    moveCapacityTierEnabled: false,
    capacityTierDays: shortTermDays,
    copyCapacityTierEnabled: false,
    immutablePerf: true,
    immutablePerfDays: 30,
    immutableCap: true,
    immutableCapDays: 30,
    archiveTierEnabled: false,
    archiveTierStandalone: false,
    archiveTierDays: 90,
    isCapTierVDCV: true,
    isManaged: true,
    machineType: 0,
    hyperVisor: 0,
    calculatorMode: 0,
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
