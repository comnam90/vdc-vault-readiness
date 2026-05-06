import { useMemo } from "react";
import type { VmAgentResponse } from "@/types/veeam-api";
import { deriveSizing } from "@/lib/sizing-derivation";
import { SizingHeroCard } from "./sizing-hero-card";
import { SizingBaselinesCard } from "./sizing-baselines-card";

interface SizingResultsProps {
  result: VmAgentResponse;
  upgradeResult?: VmAgentResponse;
  sobrBlocksUpgrade?: boolean;
}

export function SizingResults({
  result,
  upgradeResult,
  sobrBlocksUpgrade = false,
}: SizingResultsProps) {
  const sizing = useMemo(() => deriveSizing(result.data), [result]);
  const upgradeSizing = useMemo(
    () => (upgradeResult ? deriveSizing(upgradeResult.data) : null),
    [upgradeResult],
  );

  // Savings are calculated whenever an upgrade comparison call exists. The
  // sobrBlocksUpgrade flag controls how the hero presents them, not whether
  // we compute them — under SOBR we surface them as the architectural-action
  // value proposition instead of the direct upgrade caption.
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
      <SizingBaselinesCard sizing={sizing} />
    </div>
  );
}
