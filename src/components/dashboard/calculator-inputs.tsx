import { useState } from "react";
import {
  Archive,
  Calculator,
  Clock,
  Cloud,
  ExternalLink,
  Info,
  Loader2,
  RotateCcw,
  Server,
  TrendingUp,
} from "lucide-react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import {
  formatDays,
  formatGFS,
  formatPercent,
  formatTB,
} from "@/lib/format-utils";
import {
  naturalRetentionYears,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";
import type { NormalizedDataset } from "@/types/domain";
import type { VmAgentResponse } from "@/types/veeam-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MINIMUM_RETENTION_DAYS } from "@/lib/constants";
import { useSettings } from "@/hooks/use-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SizingResults } from "./sizing-results";
import { CalculatorConsentDialog } from "./calculator-consent-dialog";
import { isVersionAtLeast } from "@/lib/version-compare";

interface BreakdownRow {
  key: string;
  left: string;
  right: string;
}

function BreakdownHoverCard({
  label,
  rows,
}: {
  label: string;
  rows: BreakdownRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`Show ${label} breakdown`}
          className="text-muted-foreground/70 hover:text-foreground inline-flex items-center justify-center motion-safe:transition-colors"
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-64 p-3">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          {label} breakdown
        </p>
        <ul className="divide-border/60 divide-y">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
            >
              <span className="text-foreground">{row.left}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {row.right}
              </span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

interface CalculatorInputsProps {
  data: NormalizedDataset;
  excludedJobNames?: Set<string>;
  // Controlled state (lifted to useCalculatorApi in DashboardView)
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  // Callbacks
  onConsentGiven: () => void;
  onCalculate: () => Promise<void>;
}

export function CalculatorInputs({
  data,
  excludedJobNames = new Set(),
  result,
  upgradeResult,
  growthSeries,
  error,
  loading,
  hasConsented,
  onConsentGiven,
  onCalculate,
}: CalculatorInputsProps) {
  const { settings } = useSettings();
  const [consentOpen, setConsentOpen] = useState(false);

  const summary = buildCalculatorSummary(
    data.jobInfo,
    data.jobSessionSummary,
    excludedJobNames,
    settings,
  );
  const activeJobCount = data.jobInfo.filter(
    (j) => !excludedJobNames.has(j.JobName),
  ).length;

  const vbrVersion = data.backupServer?.[0]?.Version ?? "";
  const isVbr12 = !isVersionAtLeast(vbrVersion, "13.0.0");
  const hasSobr = (data.sobr?.length ?? 0) > 0;

  const effectiveRetentionYears =
    settings.limitCalculationYears !== null
      ? settings.limitCalculationYears +
        (settings.limitCalculationMonths ?? 0) / 12
      : naturalRetentionYears(summary);
  const cappedAtYears = effectiveRetentionYears > 12 ? 12 : undefined;

  const handleButtonClick = () => {
    if (hasConsented) {
      void onCalculate();
    } else {
      setConsentOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Calculator Inputs
            <Badge variant="outline" className="font-normal">
              Estimated
            </Badge>
          </CardTitle>
          <CardDescription>
            Aggregated values from {activeJobCount} job
            {activeJobCount !== 1 ? "s" : ""}
            {excludedJobNames.size > 0 && (
              <span className="text-warning ml-1">
                ({excludedJobNames.size} excluded)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                Source Data
                <BreakdownHoverCard
                  label="Source data"
                  rows={summary.sourceDataBreakdown.map((b) => ({
                    key: b.type,
                    left: b.type,
                    right: formatTB(b.tb),
                  }))}
                />
              </div>
              <p className="font-mono text-2xl font-semibold">
                {formatTB(summary.totalSourceDataTB)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Daily Change Rate
              </p>
              <p className="font-mono text-2xl font-semibold">
                {formatPercent(summary.weightedAvgChangeRate, 2)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Immutability Period
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold">
                  {summary.immutabilityDays} days
                </p>
                <span className="text-muted-foreground text-xs">
                  (VDC Vault minimum)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                Retention
                <BreakdownHoverCard
                  label="Retention distribution"
                  rows={summary.retentionDistribution.map((r) => ({
                    key: String(r.days),
                    left: `${r.count} job${r.count !== 1 ? "s" : ""}`,
                    right: formatDays(r.days),
                  }))}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold">
                  {formatDays(summary.maxRetentionDays)}
                </p>
                {summary.originalMaxRetentionDays !== null &&
                  summary.originalMaxRetentionDays < MINIMUM_RETENTION_DAYS && (
                    <span className="text-muted-foreground text-xs">
                      (current: {summary.originalMaxRetentionDays} days)
                    </span>
                  )}
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                Extended Retention
                <BreakdownHoverCard
                  label="GFS distribution"
                  rows={summary.gfsDistribution.map((g) => ({
                    key: g.policy,
                    left: `${g.count} job${g.count !== 1 ? "s" : ""}`,
                    right: g.policy,
                  }))}
                />
              </div>
              <p className="font-mono text-2xl font-semibold">
                {formatGFS(
                  summary.gfsWeekly,
                  summary.gfsMonthly,
                  summary.gfsYearly,
                )}
              </p>
            </div>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center gap-1.5 border-t pt-4"
            data-testid="settings-indicators"
          >
            <span className="text-muted-foreground mr-1 text-xs font-medium tracking-wider uppercase">
              Active settings
            </span>
            <Badge
              variant="outline"
              className="text-muted-foreground gap-1 text-xs font-normal"
            >
              {settings.targetCloud === "AWS" ? (
                <Server className="size-3" aria-hidden="true" />
              ) : (
                <Cloud className="size-3" aria-hidden="true" />
              )}
              Target: {settings.targetCloud}
            </Badge>
            {(settings.growthPercent > 0 || settings.growthYears > 0) && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <TrendingUp className="size-3" aria-hidden="true" />
                Growth: {settings.growthPercent}% ({settings.growthYears}y)
              </Badge>
            )}
            {settings.limitCalculationYears !== null && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <Clock className="size-3" aria-hidden="true" />
                Retention cap:{" "}
                {settings.limitCalculationYears > 0 &&
                settings.limitCalculationMonths > 0
                  ? `${settings.limitCalculationYears}y ${settings.limitCalculationMonths}m`
                  : settings.limitCalculationMonths > 0
                    ? `${settings.limitCalculationMonths}m`
                    : `${settings.limitCalculationYears}y`}
              </Badge>
            )}
            {settings.ignoreArchiveTier && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <Archive className="size-3" aria-hidden="true" />
                Simulating: Archive Tier Ignored
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={handleButtonClick}
            disabled={loading}
            className="sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2
                  className="mr-2 size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Calculating…
              </>
            ) : result ? (
              <>
                <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                Re-calculate
              </>
            ) : (
              <>
                <Calculator className="mr-2 size-4" aria-hidden="true" />
                Get Sizing Estimate
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://www.veeam.com/calculators/simple/vdc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground"
            >
              <ExternalLink className="mr-1 size-3" aria-hidden="true" />
              Advanced calculator
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <SizingResults
          result={result}
          upgradeResult={upgradeResult ?? undefined}
          sobrBlocksUpgrade={isVbr12 && hasSobr}
          growthSeries={growthSeries}
          greenfieldSimulation={settings.greenfieldSimulation}
          historicalDataYears={settings.historicalDataYears}
          cappedAtYears={cappedAtYears}
        />
      )}

      <CalculatorConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={() => {
          onConsentGiven();
          void onCalculate();
        }}
        onDecline={() => {}}
        summary={summary}
        activeJobCount={activeJobCount}
        vbrVersion={vbrVersion}
      />
    </div>
  );
}
