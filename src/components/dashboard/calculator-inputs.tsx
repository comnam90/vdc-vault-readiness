import { useState } from "react";
import { ExternalLink, Loader2, RotateCcw, Calculator } from "lucide-react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { callVmAgentApi } from "@/lib/veeam-api";
import { formatDays, formatPercent, formatTB } from "@/lib/format-utils";
import type { NormalizedDataset } from "@/types/domain";
import type { VmAgentResponse } from "@/types/veeam-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MINIMUM_RETENTION_DAYS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SizingResults } from "./sizing-results";
import { UpgradeSavings } from "./upgrade-savings";
import { CalculatorConsentDialog } from "./calculator-consent-dialog";

interface CalculatorInputsProps {
  data: NormalizedDataset;
  excludedJobNames?: Set<string>;
}

export function CalculatorInputs({
  data,
  excludedJobNames = new Set(),
}: CalculatorInputsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VmAgentResponse | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<VmAgentResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);

  const summary = buildCalculatorSummary(
    data.jobInfo,
    data.jobSessionSummary,
    excludedJobNames,
  );
  const activeJobCount = data.jobInfo.filter(
    (j) => !excludedJobNames.has(j.JobName),
  ).length;

  const vbrVersion = data.backupServer?.[0]?.Version ?? "";
  const isVbr12 = parseInt(vbrVersion.split(".")[0], 10) < 13;
  const hasSobr = (data.sobr?.length ?? 0) > 0;
  const showUpgrade = isVbr12 && !hasSobr;

  const handleGetEstimate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUpgradeResult(null);
    try {
      if (showUpgrade) {
        const [v12Res, v13Res] = await Promise.all([
          callVmAgentApi(summary, activeJobCount, vbrVersion),
          callVmAgentApi(summary, activeJobCount, vbrVersion, 0),
        ]);
        setResult(v12Res);
        setUpgradeResult(v13Res);
      } else {
        const res = await callVmAgentApi(summary, activeJobCount, vbrVersion);
        setResult(res);
        setUpgradeResult(null);
      }
    } catch {
      setError(
        "Could not retrieve sizing estimate. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatGFS = (w: number | null, m: number | null, y: number | null) => {
    if (w === null && m === null && y === null) return "None configured";
    const parts = [];
    if (w !== null) parts.push(`Weekly: ${w}`);
    if (m !== null) parts.push(`Monthly: ${m}`);
    if (y !== null) parts.push(`Yearly: ${y}`);
    return parts.join(", ");
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
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Source Data
              </p>
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
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Retention
              </p>
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
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Extended Retention
              </p>
              <p className="font-mono text-2xl font-semibold">
                {formatGFS(
                  summary.gfsWeekly,
                  summary.gfsMonthly,
                  summary.gfsYearly,
                )}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={() => setConsentOpen(true)}
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

      {result && <SizingResults result={result} />}
      {result && upgradeResult && (
        <UpgradeSavings v12Result={result} v13Result={upgradeResult} />
      )}

      <CalculatorConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={() => void handleGetEstimate()}
        onDecline={() => {}}
        summary={summary}
        activeJobCount={activeJobCount}
        vbrVersion={vbrVersion}
      />
    </div>
  );
}
