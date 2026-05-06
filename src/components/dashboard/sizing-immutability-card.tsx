import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSize } from "@/lib/format-utils";
import type { DerivedSizing } from "@/lib/sizing-derivation";
import { SizingMetricRow } from "./sizing-metric-row";

export interface SizingImmutabilityCardProps {
  sizing: DerivedSizing;
  /** GB; from upgradeResult.data.performanceTierImmutabilityTaxGB. */
  upgradePerfTaxGB: number | null;
  /** GB; precomputed savings from caller. */
  immutabilitySavingsGB: number;
}

/** Sub-TB renders as e.g. "678.7 GB", >= 1 TB renders as "X.XX TB". */
function formatPerfTax(gb: number): string {
  const sized = formatSize(gb);
  return sized ? `${sized.value} ${sized.unit}` : "N/A";
}

export function SizingImmutabilityCard({
  sizing,
  upgradePerfTaxGB,
  immutabilitySavingsGB,
}: SizingImmutabilityCardProps) {
  const showSavings = immutabilitySavingsGB > 0 && upgradePerfTaxGB !== null;

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards motion-safe:delay-[900ms]">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Immutability Tax
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <SizingMetricRow
          label="Performance Tier"
          value={formatPerfTax(sizing.performanceTaxGB)}
          annotation={
            showSavings ? (
              <>↓ VBR 13: {formatPerfTax(upgradePerfTaxGB)}</>
            ) : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
