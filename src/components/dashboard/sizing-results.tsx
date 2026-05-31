import { useMemo } from "react";
import type { VmAgentResponse } from "@/types/veeam-api";
import { deriveSizing } from "@/lib/sizing-derivation";
import { applyBufferToSizing, applyBufferToSeries } from "@/lib/sizing-buffer";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";
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
}: SizingResultsProps) {
  const sizing = useMemo(
    () =>
      applyBufferToSizing(
        deriveSizing(result.data),
        bufferEnabled,
        bufferPercent,
      ),
    [result, bufferEnabled, bufferPercent],
  );
  const upgradeSizing = useMemo(
    () =>
      upgradeResult
        ? applyBufferToSizing(
            deriveSizing(upgradeResult.data),
            bufferEnabled,
            bufferPercent,
          )
        : null,
    [upgradeResult, bufferEnabled, bufferPercent],
  );

  const bufferedGrowthSeries = useMemo(
    () =>
      growthSeries != null
        ? applyBufferToSeries(growthSeries, bufferEnabled, bufferPercent)
        : growthSeries,
    [growthSeries, bufferEnabled, bufferPercent],
  );

  const hasUpgrade = upgradeSizing !== null;
  const storageSavingsTB = hasUpgrade
    ? Math.max(0, sizing.totalStorageTB - upgradeSizing.totalStorageTB)
    : 0;
  // performanceTaxGB is the immutability overhead charged by Veeam, independent of the
  // headroom buffer. applyBufferToSizing does not scale it, so this diff is the raw
  // VBR-12→13 immutability saving — correct, since buffer headroom doesn't affect
  // immutability overhead.
  const immutabilitySavingsGB = hasUpgrade
    ? Math.max(0, sizing.performanceTaxGB - upgradeSizing.performanceTaxGB)
    : 0;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards space-y-6 duration-500">
      <SizingHeroCard
        sizing={sizing}
        upgradeTotalStorageTB={hasUpgrade ? upgradeSizing.totalStorageTB : null}
        storageSavingsTB={storageSavingsTB}
        upgradePerfTaxGB={hasUpgrade ? upgradeSizing.performanceTaxGB : null}
        immutabilitySavingsGB={immutabilitySavingsGB}
        sobrBlocksUpgrade={sobrBlocksUpgrade}
        bufferPercent={bufferEnabled ? bufferPercent : undefined}
      />
      {bufferedGrowthSeries != null && (
        <GrowthChart
          data={bufferedGrowthSeries}
          greenfield={greenfieldSimulation}
          historicalDataYears={historicalDataYears}
          cappedAtYears={cappedAtYears}
        />
      )}
      <SizingBaselinesCard sizing={sizing} />
    </div>
  );
}
