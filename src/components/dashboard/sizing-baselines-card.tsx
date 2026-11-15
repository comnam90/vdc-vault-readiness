import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTB } from "@/lib/format-utils";
import type { DerivedSizing } from "@/lib/sizing-derivation";
import { SizingMetricRow } from "./sizing-metric-row";

export interface SizingBaselinesCardProps {
  sizing: DerivedSizing;
}

function valueOrDash(value: number | null): string {
  return value === null ? "—" : formatTB(value);
}

export function SizingBaselinesCard({ sizing }: SizingBaselinesCardProps) {
  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards motion-safe:delay-[900ms]">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Backup Baselines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <SizingMetricRow
          label="Est. Initial Full"
          value={valueOrDash(sizing.initialFullTB)}
        />
        <SizingMetricRow
          label="Est. Daily Incremental"
          value={valueOrDash(sizing.dailyIncrementalTB)}
        />
      </CardContent>
    </Card>
  );
}
