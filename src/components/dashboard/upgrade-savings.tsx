import type { VmAgentResponse } from "@/types/veeam-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface UpgradeSavingsProps {
  v12Result: VmAgentResponse;
  v13Result: VmAgentResponse;
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

export function UpgradeSavings({ v12Result, v13Result }: UpgradeSavingsProps) {
  const storageSavingsTB =
    v12Result.data.totalStorageTB - v13Result.data.totalStorageTB;
  const immutabilityReductionGB =
    v12Result.data.performanceTierImmutabilityTaxGB -
    v13Result.data.performanceTierImmutabilityTaxGB;

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
      <CardHeader>
        <CardTitle>
          Upgrade to VBR 13 Saves {storageSavingsTB.toFixed(2)} TB
        </CardTitle>
        <CardDescription>
          Estimated savings by upgrading from VBR 12 to VBR 13 (direct-to-Vault
          immutability overhead is lower in v13)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <SectionHeading>Immutability Overhead Reduction</SectionHeading>
          <ResultRow label="Performance Tier">
            {immutabilityReductionGB} GB
          </ResultRow>
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Total Storage</SectionHeading>
          <ResultRow label="VBR 12">
            {v12Result.data.totalStorageTB.toFixed(2)} TB
          </ResultRow>
          <ResultRow label="VBR 13">
            {v13Result.data.totalStorageTB.toFixed(2)} TB
          </ResultRow>
        </div>
      </CardContent>
    </Card>
  );
}
