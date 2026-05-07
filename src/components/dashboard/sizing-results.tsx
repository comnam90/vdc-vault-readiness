import { useMemo } from "react";
import type { VmAgentResponse } from "@/types/veeam-api";
import { deriveSizing } from "@/lib/sizing-derivation";
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
}

export function SizingResults({
  result,
  upgradeResult,
  sobrBlocksUpgrade = false,
  growthSeries,
  greenfieldSimulation = false,
}: SizingResultsProps) {
  const sizing = useMemo(() => deriveSizing(result.data), [result]);
  const upgradeSizing = useMemo(
    () => (upgradeResult ? deriveSizing(upgradeResult.data) : null),
    [upgradeResult],
  );

  const hasUpgrade = upgradeSizing !== null;
  const storageSavingsTB = hasUpgrade
    ? Math.max(0, sizing.totalStorageTB - upgradeSizing.totalStorageTB)
    : 0;
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
      />
      {growthSeries !== undefined && (
        <GrowthChart data={growthSeries} greenfield={greenfieldSimulation} />
      )}
      <SizingBaselinesCard sizing={sizing} />
    </div>
  );
}
