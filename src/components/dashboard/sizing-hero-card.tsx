import { Card, CardContent } from "@/components/ui/card";
import { formatSize, formatTB } from "@/lib/format-utils";
import type {
  CompositionBuckets,
  DerivedSizing,
} from "@/lib/sizing-derivation";
import { SizingProportionBar } from "./sizing-proportion-bar";

export interface SizingHeroCardProps {
  sizing: DerivedSizing;
  upgradeTotalStorageTB: number | null;
  storageSavingsTB: number;
  /** GB; from upgradeResult.data.performanceTierImmutabilityTaxGB. */
  upgradePerfTaxGB: number | null;
  /** GB; precomputed savings from caller. */
  immutabilitySavingsGB: number;
  sobrBlocksUpgrade: boolean;
}

type Segment = keyof CompositionBuckets;

const LEGEND_ORDER: Segment[] = [
  "yearly",
  "monthly",
  "weekly",
  "daily",
  "immutability",
];

const LEGEND_LABEL: Record<Segment, string> = {
  yearly: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
  immutability: "Immutability Overhead",
};

const LEGEND_COLOR: Record<Segment, string> = {
  yearly: "var(--chart-5)",
  monthly: "var(--chart-3)",
  weekly: "var(--chart-2)",
  daily: "var(--chart-1)",
  immutability: "var(--chart-4)",
};

/**
 * Stagger times the legend cells to the *tail* of the bar fill — labels
 * confirm a settled bar rather than racing alongside still-growing segments.
 * Bar starts at t=0 with --duration-slow (400ms); the first label fades in at
 * 300ms (~75% through the bar) and the last completes around 950ms.
 */
const LEGEND_DELAY_MS: Record<Segment, number> = {
  yearly: 300,
  monthly: 400,
  weekly: 500,
  daily: 600,
  immutability: 700,
};

function formatPerfTax(gb: number): string {
  const sized = formatSize(gb);
  return sized ? `${sized.value} ${sized.unit}` : "N/A";
}

export function SizingHeroCard({
  sizing,
  upgradeTotalStorageTB,
  storageSavingsTB,
  upgradePerfTaxGB,
  immutabilitySavingsGB,
  sobrBlocksUpgrade,
}: SizingHeroCardProps) {
  const hasUpgradeSavings = storageSavingsTB > 0;
  const showStandardUpgradeCaption =
    !sobrBlocksUpgrade && upgradeTotalStorageTB !== null && hasUpgradeSavings;
  const showSobrActionableCaption = sobrBlocksUpgrade && hasUpgradeSavings;
  const showImmutabilitySavings =
    upgradePerfTaxGB !== null && immutabilitySavingsGB > 0;

  return (
    <Card className="border-t-primary border-t-4">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Total Storage Required
          </p>
          <p
            aria-label={`Total storage required: ${formatTB(sizing.totalStorageTB)}`}
            className="text-foreground motion-safe:animate-celebrate-in font-mono text-5xl tracking-tight tabular-nums sm:text-6xl lg:text-7xl"
          >
            {formatTB(sizing.totalStorageTB)}
          </p>

          {showSobrActionableCaption && (
            <p className="text-muted-foreground motion-safe:animate-in motion-safe:fade-in fill-mode-backwards text-sm motion-safe:delay-300">
              Potentially save{" "}
              <span className="font-mono">{formatTB(storageSavingsTB)}</span> by
              upgrading to VBR 13 and transitioning SOBRs to direct Backup Copy
              jobs.
            </p>
          )}
          {showStandardUpgradeCaption && (
            <p className="text-muted-foreground motion-safe:animate-in motion-safe:fade-in fill-mode-backwards text-sm motion-safe:delay-300">
              Upgrade to VBR 13 could reduce this to{" "}
              <span className="font-mono">
                {formatTB(upgradeTotalStorageTB)}
              </span>{" "}
              (saving {formatTB(storageSavingsTB)})
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Composition by retention tier
          </p>
          <SizingProportionBar
            buckets={sizing.compositionBuckets}
            sumTB={sizing.compositionTotalTB}
            counts={sizing.gfsBucketCounts}
          />

          {sizing.compositionTotalTB > 0 && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-5">
                {LEGEND_ORDER.map((seg) => (
                  <div
                    key={seg}
                    className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards flex items-baseline gap-2 motion-safe:duration-[var(--duration-normal)]"
                    style={{ animationDelay: `${LEGEND_DELAY_MS[seg]}ms` }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: LEGEND_COLOR[seg] }}
                    />
                    <span className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase">
                        {LEGEND_LABEL[seg]}
                      </span>
                      <span className="font-mono text-base tabular-nums sm:text-lg">
                        {seg === "immutability"
                          ? formatPerfTax(sizing.performanceTaxGB)
                          : formatTB(sizing.compositionBuckets[seg])}
                      </span>
                      {seg === "immutability" && showImmutabilitySavings && (
                        <span className="text-muted-foreground font-mono text-xs">
                          ↓ VBR 13: {formatPerfTax(upgradePerfTaxGB)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground text-xs">
                {formatTB(sizing.gfsSumTB)} across {sizing.gfsRestorePointCount}{" "}
                restore points and {formatTB(sizing.performanceTaxTB)} of
                immutability overhead.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
