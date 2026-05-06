import type { CalculatorSummary } from "@/types/calculator";
import type { VmAgentRequest, VmAgentResponse } from "@/types/veeam-api";
import {
  DEFAULT_SETTINGS,
  type GlobalSettings,
  type TargetCloud,
} from "@/types/settings";

const API_URL = "/api/veeam-proxy";

const CLOUD_TO_BLOCK_GENERATION_DAYS: Record<TargetCloud, number> = {
  Azure: 10,
  AWS: 30,
};

function vbrMajorVersion(version: string): number {
  return parseInt(version.split(".")[0], 10);
}

export function buildVmAgentRequest(
  summary: CalculatorSummary,
  jobCount: number,
  vbrVersion: string,
  productVersionOverride?: number,
  settings: GlobalSettings = DEFAULT_SETTINGS,
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
    GrowthRatePercent: settings.growthPercent,
    GrowthRateScopeYears: settings.growthYears,
    blockGenerationDays: CLOUD_TO_BLOCK_GENERATION_DAYS[settings.targetCloud],
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
    productVersion:
      productVersionOverride ?? (vbrMajorVersion(vbrVersion) >= 13 ? 0 : -1),
    instanceCount: jobCount,
  };
}

export async function callVmAgentApi(
  summary: CalculatorSummary,
  jobCount: number,
  vbrVersion: string,
  productVersionOverride?: number,
  settings: GlobalSettings = DEFAULT_SETTINGS,
): Promise<VmAgentResponse> {
  const payload = buildVmAgentRequest(
    summary,
    jobCount,
    vbrVersion,
    productVersionOverride,
    settings,
  );
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
