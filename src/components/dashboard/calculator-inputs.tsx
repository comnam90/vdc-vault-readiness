import { useMemo, useState } from "react";
import {
  Archive,
  Calculator,
  Check,
  Clock,
  Cloud,
  ExternalLink,
  Info,
  Loader2,
  Pencil,
  RotateCcw,
  Server,
  Shield,
  TrendingUp,
  X,
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
import {
  DEFAULT_IMMUTABILITY_DAYS,
  MINIMUM_RETENTION_DAYS,
} from "@/lib/constants";
import { useSettings } from "@/hooks/use-settings";
import type { CalculatorOverrides } from "@/hooks/use-calculator-api";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SizingResults } from "./sizing-results";
import { CalculatorConsentDialog } from "./calculator-consent-dialog";
import { isVersionAtLeast } from "@/lib/version-compare";

export type GfsState = {
  weekly: number | null;
  monthly: number | null;
  yearly: number | null;
};

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
  // Lifted override inputs
  immutabilityDays: number;
  retentionDays: number;
  gfs: GfsState;
  onImmutabilityDaysChange: (v: number) => void;
  onRetentionDaysChange: (v: number) => void;
  onGfsChange: (v: GfsState) => void;
  // Callbacks
  onConsentGiven: () => void;
  onCalculate: (overrides: CalculatorOverrides) => Promise<void>;
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
  immutabilityDays,
  retentionDays,
  gfs,
  onImmutabilityDaysChange,
  onRetentionDaysChange,
  onGfsChange,
  onConsentGiven,
  onCalculate,
}: CalculatorInputsProps) {
  const { settings } = useSettings();

  const summary = useMemo(
    () =>
      buildCalculatorSummary(
        data.jobInfo,
        data.jobSessionSummary,
        excludedJobNames,
        settings,
      ),
    [data, excludedJobNames, settings],
  );

  const [consentOpen, setConsentOpen] = useState(false);

  // Drafts are seeded from props at mount and are re-synced only by the
  // confirm/cancel/reset handlers below. This is safe because the controlled
  // props (immutabilityDays, retentionDays, gfs) are exclusively updated via
  // this component's own on*Change callbacks — no external code changes them
  // while an edit is in flight. If that assumption ever breaks, add a
  // useEffect to re-sync drafts when the props change.
  const [isEditingImmutability, setIsEditingImmutability] =
    useState<boolean>(false);
  const [immutabilityDraft, setImmutabilityDraft] =
    useState<number>(immutabilityDays);

  const [isEditingRetention, setIsEditingRetention] = useState<boolean>(false);
  const [retentionDraft, setRetentionDraft] = useState<number>(retentionDays);

  const [isEditingGfs, setIsEditingGfs] = useState<boolean>(false);
  const [gfsDraft, setGfsDraft] = useState<GfsState>(gfs);

  const handleImmutabilityConfirm = () => {
    if (!Number.isFinite(immutabilityDraft) || immutabilityDraft <= 0) return;
    onImmutabilityDaysChange(immutabilityDraft);
    setIsEditingImmutability(false);
  };

  const handleImmutabilityCancel = () => {
    setIsEditingImmutability(false);
    setImmutabilityDraft(immutabilityDays);
  };

  const handleImmutabilityReset = () => {
    onImmutabilityDaysChange(DEFAULT_IMMUTABILITY_DAYS);
    setImmutabilityDraft(DEFAULT_IMMUTABILITY_DAYS);
    setIsEditingImmutability(false);
  };

  const handleRetentionConfirm = () => {
    if (
      !Number.isFinite(retentionDraft) ||
      retentionDraft < MINIMUM_RETENTION_DAYS
    )
      return;
    onRetentionDaysChange(retentionDraft);
    setIsEditingRetention(false);
  };

  const handleRetentionCancel = () => {
    setIsEditingRetention(false);
    setRetentionDraft(retentionDays);
  };

  const handleRetentionReset = () => {
    const resetTo = summary.maxRetentionDays ?? MINIMUM_RETENTION_DAYS;
    onRetentionDaysChange(resetTo);
    setRetentionDraft(resetTo);
    setIsEditingRetention(false);
  };

  const handleGfsConfirm = () => {
    const isInvalid = (v: number | null) =>
      v !== null && (!Number.isFinite(v) || v < 0);
    if (
      isInvalid(gfsDraft.weekly) ||
      isInvalid(gfsDraft.monthly) ||
      isInvalid(gfsDraft.yearly)
    )
      return;
    onGfsChange(gfsDraft);
    setIsEditingGfs(false);
  };

  const handleGfsCancel = () => {
    setIsEditingGfs(false);
    setGfsDraft(gfs);
  };

  const handleGfsReset = () => {
    const resetTo: GfsState = {
      weekly: summary.gfsWeekly,
      monthly: summary.gfsMonthly,
      yearly: summary.gfsYearly,
    };
    onGfsChange(resetTo);
    setGfsDraft(resetTo);
    setIsEditingGfs(false);
  };
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

  const buildOverrides = (): CalculatorOverrides => ({
    immutabilityDays,
    retentionDays,
    gfsWeekly: gfs.weekly,
    gfsMonthly: gfs.monthly,
    gfsYearly: gfs.yearly,
  });

  const handleButtonClick = () => {
    if (hasConsented) {
      void onCalculate(buildOverrides());
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
              {isEditingImmutability ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={
                      Number.isNaN(immutabilityDraft) ? "" : immutabilityDraft
                    }
                    onChange={(e) =>
                      setImmutabilityDraft(parseInt(e.target.value, 10))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImmutabilityConfirm();
                      if (e.key === "Escape") handleImmutabilityCancel();
                    }}
                    className="w-20 font-mono"
                    autoFocus
                  />
                  <span className="text-muted-foreground text-sm">days</span>
                  <Button
                    type="button"
                    size="icon"
                    className="size-7"
                    onClick={handleImmutabilityConfirm}
                    aria-label="Confirm immutability period"
                  >
                    <Check className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={handleImmutabilityCancel}
                    aria-label="Cancel immutability period edit"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 text-xs"
                    onClick={handleImmutabilityReset}
                  >
                    <RotateCcw className="mr-1 size-3" aria-hidden="true" />
                    Reset to {DEFAULT_IMMUTABILITY_DAYS}
                  </Button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="font-mono text-2xl font-semibold">
                    {immutabilityDays} days
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setImmutabilityDraft(immutabilityDays);
                      setIsEditingImmutability(true);
                    }}
                    aria-label="Edit immutability period"
                    className={cn(
                      "inline-flex items-center justify-center motion-safe:transition-colors",
                      immutabilityDays !== DEFAULT_IMMUTABILITY_DAYS
                        ? "text-primary"
                        : "text-muted-foreground/70 hover:text-foreground",
                    )}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
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
              {isEditingRetention ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={MINIMUM_RETENTION_DAYS}
                    value={Number.isNaN(retentionDraft) ? "" : retentionDraft}
                    onChange={(e) =>
                      setRetentionDraft(parseInt(e.target.value, 10))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRetentionConfirm();
                      if (e.key === "Escape") handleRetentionCancel();
                    }}
                    className="w-20 font-mono"
                    autoFocus
                  />
                  <span className="text-muted-foreground text-sm">days</span>
                  <Button
                    type="button"
                    size="icon"
                    className="size-7"
                    onClick={handleRetentionConfirm}
                    aria-label="Confirm retention"
                  >
                    <Check className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={handleRetentionCancel}
                    aria-label="Cancel retention edit"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 text-xs"
                    onClick={handleRetentionReset}
                    aria-label={`Reset retention to ${summary.maxRetentionDays ?? MINIMUM_RETENTION_DAYS}`}
                  >
                    <RotateCcw className="mr-1 size-3" aria-hidden="true" />
                    Reset to{" "}
                    {summary.maxRetentionDays ?? MINIMUM_RETENTION_DAYS}
                  </Button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="font-mono text-2xl font-semibold">
                    {retentionDays} days
                  </p>
                  {summary.originalMaxRetentionDays !== null &&
                    summary.originalMaxRetentionDays <
                      MINIMUM_RETENTION_DAYS && (
                      <span className="text-muted-foreground text-xs">
                        (current: {summary.originalMaxRetentionDays} days)
                      </span>
                    )}
                  <button
                    type="button"
                    onClick={() => {
                      setRetentionDraft(retentionDays);
                      setIsEditingRetention(true);
                    }}
                    aria-label="Edit retention"
                    className={cn(
                      "inline-flex items-center justify-center motion-safe:transition-colors",
                      retentionDays !==
                        (summary.maxRetentionDays ?? MINIMUM_RETENTION_DAYS)
                        ? "text-primary"
                        : "text-muted-foreground/70 hover:text-foreground",
                    )}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
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
              {isEditingGfs ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-muted-foreground flex items-center gap-1 text-sm">
                    W
                    <Input
                      type="number"
                      min={0}
                      value={gfsDraft.weekly ?? ""}
                      onChange={(e) => {
                        const p = parseInt(e.target.value, 10);
                        setGfsDraft((d) => ({
                          ...d,
                          weekly: Number.isNaN(p) ? null : p,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGfsConfirm();
                        if (e.key === "Escape") handleGfsCancel();
                      }}
                      className="w-16 font-mono"
                      autoFocus
                      aria-label="Weekly GFS"
                    />
                  </label>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm">
                    M
                    <Input
                      type="number"
                      min={0}
                      value={gfsDraft.monthly ?? ""}
                      onChange={(e) => {
                        const p = parseInt(e.target.value, 10);
                        setGfsDraft((d) => ({
                          ...d,
                          monthly: Number.isNaN(p) ? null : p,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGfsConfirm();
                        if (e.key === "Escape") handleGfsCancel();
                      }}
                      className="w-16 font-mono"
                      aria-label="Monthly GFS"
                    />
                  </label>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm">
                    Y
                    <Input
                      type="number"
                      min={0}
                      value={gfsDraft.yearly ?? ""}
                      onChange={(e) => {
                        const p = parseInt(e.target.value, 10);
                        setGfsDraft((d) => ({
                          ...d,
                          yearly: Number.isNaN(p) ? null : p,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGfsConfirm();
                        if (e.key === "Escape") handleGfsCancel();
                      }}
                      className="w-16 font-mono"
                      aria-label="Yearly GFS"
                    />
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    className="size-7"
                    onClick={handleGfsConfirm}
                    aria-label="Confirm GFS"
                  >
                    <Check className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={handleGfsCancel}
                    aria-label="Cancel GFS edit"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 text-xs"
                    onClick={handleGfsReset}
                    aria-label="Reset GFS to file values"
                  >
                    <RotateCcw className="mr-1 size-3" aria-hidden="true" />
                    Reset to file values
                  </Button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="font-mono text-2xl font-semibold">
                    {formatGFS(gfs.weekly, gfs.monthly, gfs.yearly)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setGfsDraft(gfs);
                      setIsEditingGfs(true);
                    }}
                    aria-label="Edit extended retention"
                    className={cn(
                      "inline-flex items-center justify-center motion-safe:transition-colors",
                      gfs.weekly !== summary.gfsWeekly ||
                        gfs.monthly !== summary.gfsMonthly ||
                        gfs.yearly !== summary.gfsYearly
                        ? "text-primary"
                        : "text-muted-foreground/70 hover:text-foreground",
                    )}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
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
            {settings.bufferEnabled && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <Shield className="size-3" aria-hidden="true" />
                Buffer: {settings.bufferPercent}%
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
          bufferEnabled={settings.bufferEnabled}
          bufferPercent={settings.bufferPercent}
        />
      )}

      <CalculatorConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={() => {
          onConsentGiven();
          void onCalculate(buildOverrides());
        }}
        onDecline={() => {}}
        summary={{
          ...summary,
          immutabilityDays,
          maxRetentionDays: retentionDays,
          originalMaxRetentionDays: retentionDays,
          gfsWeekly: gfs.weekly,
          gfsMonthly: gfs.monthly,
          gfsYearly: gfs.yearly,
        }}
        activeJobCount={activeJobCount}
        vbrVersion={vbrVersion}
      />
    </div>
  );
}
