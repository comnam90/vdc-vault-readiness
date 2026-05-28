import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
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

  const requestIdRef = useRef(0);

  // Serialise inputs that affect the calculation. When this key changes,
  // clear all result state so the user must re-calculate for the new inputs.
  const inputKey = useMemo(
    () =>
      JSON.stringify({
        excluded: [...excludedJobNames].sort(),
        settings,
      }),
    [excludedJobNames, settings],
  );

  useEffect(() => {
    requestIdRef.current++; // cancel in-flight calculate()
    setResult(null);
    setUpgradeResult(null);
    setGrowthSeries(null);
    setError(null);
  }, [inputKey]);

  const grantConsent = useCallback(() => {
    setHasConsented(true);
  }, []);

  const calculate = useCallback(async () => {
    const vbrVersion = data.backupServer?.[0]?.Version ?? "";
    const isVbr12 = !isVersionAtLeast(vbrVersion, "13.0.0");
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
            summary,
            activeJobCount,
            vbrVersion,
            undefined,
            settings,
          ),
          callVmAgentApi(summary, activeJobCount, vbrVersion, 0, settings),
          generateGrowthSeries(growthArgs),
        ]);
        if (isStale()) return;
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
