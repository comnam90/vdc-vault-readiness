import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildCalculatorSummary,
  capGfsToSettings,
  globalCapDays,
} from "@/lib/calculator-aggregator";
import {
  generateGrowthSeries,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";
import type { NormalizedDataset } from "@/types/domain";
import type { GlobalSettings } from "@/types/settings";
import type { VmAgentResponse } from "@/types/veeam-api";
import { callVmAgentApi } from "@/lib/veeam-api";
import { isVersionAtLeast } from "@/lib/version-compare";

export interface UseCalculatorApiOptions {
  data: NormalizedDataset;
  excludedJobNames: Set<string>;
  settings: GlobalSettings;
  immutabilityDays: number;
  retentionDays: number;
  gfsWeekly: number | null;
  gfsMonthly: number | null;
  gfsYearly: number | null;
}

export interface CalculatorOverrides {
  immutabilityDays: number;
  retentionDays: number;
  gfsWeekly: number | null;
  gfsMonthly: number | null;
  gfsYearly: number | null;
}

export interface UseCalculatorApiResult {
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  upgradeGrowthSeries: GrowthSeriesPoint[] | null;
  upgradeGrowthLoading: boolean;
  upgradeGrowthError: string | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  grantConsent: () => void;
  calculate: (overrides: CalculatorOverrides) => Promise<void>;
  generateUpgradeGrowth: () => Promise<void>;
}

export function useCalculatorApi({
  data,
  excludedJobNames,
  settings,
  immutabilityDays,
  retentionDays,
  gfsWeekly,
  gfsMonthly,
  gfsYearly,
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

  const requestIdRef = useRef(0);

  const [upgradeGrowthSeries, setUpgradeGrowthSeries] = useState<
    GrowthSeriesPoint[] | null
  >(null);
  const [upgradeGrowthLoading, setUpgradeGrowthLoading] = useState(false);
  const [upgradeGrowthError, setUpgradeGrowthError] = useState<string | null>(
    null,
  );
  const upgradeGrowthLoadingRef = useRef(false);
  const upgradeGrowthDoneRef = useRef(false);
  const lastOverridesRef = useRef<CalculatorOverrides | null>(null);

  // Serialise inputs that affect the calculation. When this key changes,
  // clear all result state so the user must re-calculate for the new inputs.
  // Buffer fields are excluded: they are a post-processing display transform
  // and must never re-trigger the Veeam sizing API.
  const inputKey = useMemo(() => {
    // bufferEnabled and bufferPercent are post-processing display transforms:
    // they must not re-trigger the Veeam sizing API when toggled. Build the
    // key from a copy that omits these two fields.
    const calcSettings: Omit<
      typeof settings,
      "bufferEnabled" | "bufferPercent"
    > = {
      targetCloud: settings.targetCloud,
      growthPercent: settings.growthPercent,
      growthYears: settings.growthYears,
      limitCalculationYears: settings.limitCalculationYears,
      limitCalculationMonths: settings.limitCalculationMonths,
      ignoreArchiveTier: settings.ignoreArchiveTier,
      greenfieldSimulation: settings.greenfieldSimulation,
      historicalDataYears: settings.historicalDataYears,
    };
    return JSON.stringify({
      excluded: [...excludedJobNames].sort(),
      settings: calcSettings,
      overrides: {
        immutabilityDays,
        retentionDays,
        gfsWeekly,
        gfsMonthly,
        gfsYearly,
      },
    });
  }, [
    excludedJobNames,
    settings,
    immutabilityDays,
    retentionDays,
    gfsWeekly,
    gfsMonthly,
    gfsYearly,
  ]);

  useEffect(() => {
    requestIdRef.current++; // cancel in-flight calculate()
    setResult(null);
    setUpgradeResult(null);
    setGrowthSeries(null);
    setError(null);
    setLoading(false);
    setUpgradeGrowthSeries(null);
    setUpgradeGrowthLoading(false);
    setUpgradeGrowthError(null);
    upgradeGrowthLoadingRef.current = false;
    upgradeGrowthDoneRef.current = false;
  }, [inputKey]);

  const grantConsent = useCallback(() => {
    setHasConsented(true);
  }, []);

  const calculate = useCallback(
    async ({
      immutabilityDays,
      retentionDays,
      gfsWeekly,
      gfsMonthly,
      gfsYearly,
    }: CalculatorOverrides) => {
      lastOverridesRef.current = {
        immutabilityDays,
        retentionDays,
        gfsWeekly,
        gfsMonthly,
        gfsYearly,
      };
      const vbrVersion = data.backupServer?.[0]?.Version ?? "";
      const isVbr12 =
        vbrVersion !== "" && !isVersionAtLeast(vbrVersion, "13.0.0");
      const activeJobCount = data.jobInfo.filter(
        (j) => !excludedJobNames.has(j.JobName),
      ).length;
      const summary = buildCalculatorSummary(
        data.jobInfo,
        data.jobSessionSummary,
        excludedJobNames,
        settings,
      );
      // Cap GFS overrides and retention to the active horizon so the hero total
      // matches the lensed display. growthArgs intentionally receives raw values
      // — generateGrowthSeries applies its own per-step capping; pre-capping
      // here would double-cap monthly-scale steps.
      const cappedGfs = capGfsToSettings(
        { weekly: gfsWeekly, monthly: gfsMonthly, yearly: gfsYearly },
        settings,
      );
      // min(x, Infinity) === x, so the no-cap path is unchanged.
      const cappedRetention = Math.min(retentionDays, globalCapDays(settings));
      const patchedSummary = {
        ...summary,
        immutabilityDays,
        maxRetentionDays: cappedRetention,
        originalMaxRetentionDays: cappedRetention,
        gfsWeekly: cappedGfs.weekly,
        gfsMonthly: cappedGfs.monthly,
        gfsYearly: cappedGfs.yearly,
      };
      const growthArgs = {
        jobs: data.jobInfo,
        sessions: data.jobSessionSummary,
        excludedJobNames,
        settings,
        jobCount: activeJobCount,
        vbrVersion,
        immutabilityDays,
        retentionDays,
        gfsWeekly,
        gfsMonthly,
        gfsYearly,
      };

      const capturedId = ++requestIdRef.current;
      const isStale = () => requestIdRef.current !== capturedId;

      setLoading(true);
      setError(null);
      setResult(null);
      setUpgradeResult(null);
      setGrowthSeries(null);

      try {
        if (isVbr12) {
          const [v12Res, v13Res, growth] = await Promise.all([
            callVmAgentApi(
              patchedSummary,
              activeJobCount,
              vbrVersion,
              undefined,
              settings,
            ),
            callVmAgentApi(
              patchedSummary,
              activeJobCount,
              vbrVersion,
              0,
              settings,
            ),
            generateGrowthSeries(growthArgs),
          ]);
          if (isStale()) return;
          setResult(v12Res);
          setUpgradeResult(v13Res);
          setGrowthSeries(growth);
        } else {
          const [res, growth] = await Promise.all([
            callVmAgentApi(
              patchedSummary,
              activeJobCount,
              vbrVersion,
              undefined,
              settings,
            ),
            generateGrowthSeries(growthArgs),
          ]);
          if (isStale()) return;
          setResult(res);
          setGrowthSeries(growth);
        }
      } catch {
        if (!isStale()) {
          setError(
            "Could not retrieve sizing estimate. Check your connection and try again.",
          );
        }
      } finally {
        if (!isStale()) {
          setLoading(false);
        }
      }
    },
    [data, excludedJobNames, settings], // overrides arrive as a CalculatorOverrides parameter — no closure capture needed
  );

  const generateUpgradeGrowth = useCallback(async () => {
    if (upgradeGrowthLoadingRef.current || upgradeGrowthDoneRef.current) return;
    if (!lastOverridesRef.current) return;

    const vbrVersion = data.backupServer?.[0]?.Version ?? "";
    const activeJobCount = data.jobInfo.filter(
      (j) => !excludedJobNames.has(j.JobName),
    ).length;
    const {
      immutabilityDays,
      retentionDays,
      gfsWeekly,
      gfsMonthly,
      gfsYearly,
    } = lastOverridesRef.current;

    const capturedId = requestIdRef.current;
    const isStale = () => requestIdRef.current !== capturedId;

    upgradeGrowthLoadingRef.current = true;
    setUpgradeGrowthLoading(true);
    setUpgradeGrowthError(null);

    try {
      const series = await generateGrowthSeries({
        jobs: data.jobInfo,
        sessions: data.jobSessionSummary,
        excludedJobNames,
        settings,
        jobCount: activeJobCount,
        vbrVersion,
        productVersionOverride: 0,
        immutabilityDays,
        retentionDays,
        gfsWeekly,
        gfsMonthly,
        gfsYearly,
      });
      if (isStale()) return;
      setUpgradeGrowthSeries(series);
      upgradeGrowthDoneRef.current = true;
    } catch {
      if (!isStale()) {
        setUpgradeGrowthError(
          "Could not retrieve sizing estimate. Check your connection and try again.",
        );
      }
    } finally {
      if (!isStale()) {
        upgradeGrowthLoadingRef.current = false;
        setUpgradeGrowthLoading(false);
      }
    }
  }, [data, excludedJobNames, settings]);

  return {
    result,
    upgradeResult,
    growthSeries,
    upgradeGrowthSeries,
    upgradeGrowthLoading,
    upgradeGrowthError,
    error,
    loading,
    hasConsented,
    grantConsent,
    calculate,
    generateUpgradeGrowth,
  };
}
