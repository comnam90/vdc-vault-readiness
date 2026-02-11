import { ExternalLink } from "lucide-react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
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

interface CalculatorInputsProps {
  data: NormalizedDataset;
  validations: ValidationResult[];
}

export function CalculatorInputs({ data }: CalculatorInputsProps) {
  const summary = buildCalculatorSummary(data.jobInfo, data.jobSessionSummary);

  const formatTB = (val: number | null) => {
    if (val === null) return "N/A";
    return `${val.toFixed(2)} TB`;
  };

  const formatPercent = (val: number | null) => {
    if (val === null) return "N/A";
    return `${val.toFixed(2)}%`;
  };

  const formatDays = (val: number | null) => {
    if (val === null) return "N/A";
    return `${val} days`;
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
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Calculator Inputs
          <Badge variant="outline" className="font-normal">
            Estimated
          </Badge>
        </CardTitle>
        <CardDescription>
          Aggregated values for the VDC Vault Calculator
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
              {formatPercent(summary.weightedAvgChangeRate)}
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
      <CardFooter>
        <Button className="w-full sm:w-auto" asChild>
          <a
            href="https://www.veeam.com/calculators/simple/vdc"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 size-4" aria-hidden="true" />
            Open VDC Vault Calculator
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
