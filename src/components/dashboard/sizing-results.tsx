import { useMemo } from "react";
import type { VmAgentResponse } from "@/types/veeam-api";
import type { SafeJob, SafeJobSession } from "@/types/domain";
import { deriveSizing } from "@/lib/sizing-derivation";
import { useSettings } from "@/hooks/use-settings";
import { SizingHeroCard } from "./sizing-hero-card";
import { SizingBaselinesCard } from "./sizing-baselines-card";
import { GrowthChart } from "./growth-chart";

interface SizingResultsProps {
  result: VmAgentResponse;
  upgradeResult?: VmAgentResponse;
  sobrBlocksUpgrade?: boolean;
  /** When provided alongside the rest of the projection inputs, the
   *  multi-year growth chart renders below the hero card. */
  jobs?: SafeJob[];
  sessions?: SafeJobSession[];
  excludedJobNames?: Set<string>;
  jobCount?: number;
  vbrVersion?: string;
}

export function SizingResults({
  result,
  upgradeResult,
  sobrBlocksUpgrade = false,
  jobs,
  sessions,
  excludedJobNames,
  jobCount,
  vbrVersion,
}: SizingResultsProps) {
  const { settings, updateSettings } = useSettings();
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
      {jobs && jobs.length > 0 && jobCount != null && vbrVersion != null && (
        <GrowthChart
          jobs={jobs}
          sessions={sessions ?? []}
          excludedJobNames={excludedJobNames ?? new Set()}
          settings={settings}
          jobCount={jobCount}
          vbrVersion={vbrVersion}
          greenfieldSimulation={settings.greenfieldSimulation}
          onGreenfieldChange={(checked) =>
            updateSettings({ greenfieldSimulation: checked })
          }
        />
      )}
      <SizingBaselinesCard sizing={sizing} />
    </div>
  );
}
