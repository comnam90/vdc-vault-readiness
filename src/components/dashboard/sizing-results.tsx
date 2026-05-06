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

  const showUpgrade = !sobrBlocksUpgrade && upgradeSizing !== null;
  const storageSavingsTB = showUpgrade
    ? Math.max(0, sizing.totalStorageTB - upgradeSizing.totalStorageTB)
    : 0;
  const immutabilitySavingsGB = showUpgrade
    ? Math.max(0, sizing.performanceTaxGB - upgradeSizing.performanceTaxGB)
    : 0;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards space-y-6 duration-500">
      <SizingHeroCard
        sizing={sizing}
        upgradeTotalStorageTB={
          showUpgrade ? upgradeSizing.totalStorageTB : null
        }
        storageSavingsTB={storageSavingsTB}
        upgradePerfTaxGB={showUpgrade ? upgradeSizing.performanceTaxGB : null}
        immutabilitySavingsGB={immutabilitySavingsGB}
        sobrBlocksUpgrade={sobrBlocksUpgrade}
      />
      <SizingBaselinesCard sizing={sizing} />
    </div>
  );
}
