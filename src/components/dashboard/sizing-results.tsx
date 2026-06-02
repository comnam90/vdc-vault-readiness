import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { VmAgentResponse } from "@/types/veeam-api";
import { deriveSizing } from "@/lib/sizing-derivation";
import { applyBufferToSizing, applyBufferToSeries } from "@/lib/sizing-buffer";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { SizingHeroCard } from "./sizing-hero-card";
import { SizingBaselinesCard } from "./sizing-baselines-card";
import { GrowthChart } from "./growth-chart";

interface SizingResultsProps {
  result: VmAgentResponse;
  upgradeResult?: VmAgentResponse;
  sobrBlocksUpgrade?: boolean;
  /** When provided, the multi-year growth chart renders below the hero card. */
  growthSeries?: GrowthSeriesPoint[] | null;
  /** Whether the growth series was generated under greenfield assumptions. */
  greenfieldSimulation?: boolean;
  /** Years of pre-existing backups seeded into the greenfield projection. */
  historicalDataYears?: number;
  /**
   * Years at which the chart's projection was clamped. When set, a notice
   * renders below the chart explaining the truncation.
   */
  cappedAtYears?: number;
  /** When true, grosses up results by 1/(1-bufferPercent/100) to show headroom. */
  bufferEnabled?: boolean;
  /** Spare-capacity percentage (1–30). Only used when bufferEnabled is true. */
  bufferPercent?: number;
  /** When true, treats upgradeResult as the primary (v13) result and result as the comparison (v12). */
  showAsV13?: boolean;
  /** Growth series for the v13 projection (used when showAsV13=true). */
  upgradeGrowthSeries?: GrowthSeriesPoint[] | null;
  /** When true, shows a loading skeleton in the chart slot instead of the chart. */
  upgradeGrowthLoading?: boolean;
  /** When set, shows a destructive alert in the chart slot instead of the chart. */
  upgradeGrowthError?: string | null;
}

export function SizingResults({
  result,
  upgradeResult,
  sobrBlocksUpgrade = false,
  growthSeries,
  greenfieldSimulation = false,
  historicalDataYears = 0,
  cappedAtYears,
  bufferEnabled = false,
  bufferPercent = 10,
  showAsV13 = false,
  upgradeGrowthSeries,
  upgradeGrowthLoading = false,
  upgradeGrowthError = null,
}: SizingResultsProps) {
  const primaryResult = showAsV13 && upgradeResult ? upgradeResult : result;
  const comparisonResult = showAsV13 ? result : (upgradeResult ?? null);

  const sizing = useMemo(
    () =>
      applyBufferToSizing(
        deriveSizing(primaryResult.data),
        bufferEnabled,
        bufferPercent,
      ),
    [primaryResult, bufferEnabled, bufferPercent],
  );
  const comparisonSizing = useMemo(
    () =>
      comparisonResult
        ? applyBufferToSizing(
            deriveSizing(comparisonResult.data),
            bufferEnabled,
            bufferPercent,
          )
        : null,
    [comparisonResult, bufferEnabled, bufferPercent],
  );

  const activeGrowthSeries = showAsV13
    ? (upgradeGrowthSeries ?? null)
    : (growthSeries ?? null);

  const bufferedActiveGrowthSeries = useMemo(
    () =>
      activeGrowthSeries != null
        ? applyBufferToSeries(activeGrowthSeries, bufferEnabled, bufferPercent)
        : activeGrowthSeries,
    [activeGrowthSeries, bufferEnabled, bufferPercent],
  );

  const hasComparison = comparisonSizing !== null;
  const immutabilitySavingsGB = hasComparison
    ? Math.abs(sizing.performanceTaxGB - comparisonSizing.performanceTaxGB)
    : 0;

  const activeGrowthLoading = showAsV13 ? upgradeGrowthLoading : false;
  const activeGrowthError = showAsV13 ? upgradeGrowthError : null;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards space-y-6 duration-500">
      <SizingHeroCard
        sizing={sizing}
        comparisonTotalStorageTB={comparisonSizing?.totalStorageTB ?? null}
        upgradePerfTaxGB={comparisonSizing?.performanceTaxGB ?? null}
        immutabilitySavingsGB={immutabilitySavingsGB}
        sobrBlocksUpgrade={sobrBlocksUpgrade && !showAsV13}
        showAsV13={showAsV13}
        bufferPercent={bufferEnabled ? bufferPercent : undefined}
      />
      {activeGrowthError ? (
        <Alert variant="destructive">
          <AlertDescription>{activeGrowthError}</AlertDescription>
        </Alert>
      ) : activeGrowthLoading ? (
        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center gap-2 pt-6">
            <Loader2
              className="size-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            <span className="text-muted-foreground text-sm">
              Calculating VBR 13 projection…
            </span>
          </CardContent>
        </Card>
      ) : bufferedActiveGrowthSeries != null ? (
        <GrowthChart
          data={bufferedActiveGrowthSeries}
          greenfield={greenfieldSimulation}
          historicalDataYears={historicalDataYears}
          cappedAtYears={cappedAtYears}
          bufferEnabled={bufferEnabled}
        />
      ) : null}
      <SizingBaselinesCard sizing={sizing} />
    </div>
  );
}
