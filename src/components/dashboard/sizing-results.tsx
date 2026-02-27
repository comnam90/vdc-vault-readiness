import type { VmAgentResponse } from "@/types/veeam-api";
import { formatSize } from "@/lib/format-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SizingResultsProps {
  result: VmAgentResponse;
  upgradeResult?: VmAgentResponse;
}

function ResultRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-2 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

export function SizingResults({ result, upgradeResult }: SizingResultsProps) {
  const { data } = result;

  const immutabilityFormatted = formatSize(
    data.performanceTierImmutabilityTaxGB,
  );

  const repoDisk = data.repoCompute.compute.volumes
    .filter((v) => v.diskPurpose === 3)
    .reduce((sum, v) => sum + v.diskGB, 0);

  const capTx = data.transactions.capacityTierTransactions;

  const storageSavingsTB = upgradeResult
    ? data.totalStorageTB - upgradeResult.data.totalStorageTB
    : null;
  const immutabilitySavingsGB = upgradeResult
    ? data.performanceTierImmutabilityTaxGB -
      upgradeResult.data.performanceTierImmutabilityTaxGB
    : null;

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
      <CardHeader>
        <CardTitle>Sizing Estimate</CardTitle>
        <CardDescription>Based on your backup environment data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Hero metric */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Total Storage Required
          </p>
          <p className="text-primary font-mono text-3xl font-bold">
            {data.totalStorageTB.toFixed(2)} TB
          </p>
          {storageSavingsTB !== null && storageSavingsTB > 0 && (
            <p className="text-muted-foreground text-sm">
              Upgrade to VBR 13 could reduce this to{" "}
              <span className="font-mono">
                {upgradeResult!.data.totalStorageTB.toFixed(2)} TB
              </span>{" "}
              (saving {storageSavingsTB.toFixed(2)} TB)
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Proxy Server</SectionHeading>
          <ResultRow label="CPU">
            {data.proxyCompute.compute.cores} cores
          </ResultRow>
          <ResultRow label="RAM">
            {data.proxyCompute.compute.ram} GB RAM
          </ResultRow>
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Repository Server</SectionHeading>
          <ResultRow label="CPU">
            {data.repoCompute.compute.cores} cores
          </ResultRow>
          <ResultRow label="RAM">
            {data.repoCompute.compute.ram} GB RAM
          </ResultRow>
          {repoDisk > 0 && (
            <ResultRow label="Disk">
              {(repoDisk / 1024).toFixed(1)} TB
            </ResultRow>
          )}
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Immutability Overhead</SectionHeading>
          <ResultRow label="Performance Tier">
            {immutabilityFormatted
              ? `${immutabilityFormatted.value} ${immutabilityFormatted.unit}`
              : "N/A"}
            {immutabilitySavingsGB !== null && immutabilitySavingsGB > 0 && (
              <span className="text-muted-foreground ml-2 font-sans text-xs font-normal">
                (saves {immutabilitySavingsGB} GB with VBR 13 upgrade)
              </span>
            )}
          </ResultRow>
        </div>

        {capTx && (
          <>
            <Separator />
            <div className="space-y-1">
              <SectionHeading>
                Monthly API Transactions (Capacity Tier)
              </SectionHeading>
              <ResultRow label="Month 1">
                {capTx.firstMonthTransactions.toLocaleString()}
              </ResultRow>
              <ResultRow label="Steady State">
                {capTx.finalMonthTransactions.toLocaleString()}
              </ResultRow>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
