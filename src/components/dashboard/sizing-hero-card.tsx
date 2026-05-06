import { Card, CardContent } from "@/components/ui/card";
import { formatTB } from "@/lib/format-utils";
import type { DerivedSizing, GfsBuckets } from "@/lib/sizing-derivation";
import { SizingProportionBar } from "./sizing-proportion-bar";

export interface SizingHeroCardProps {
  sizing: DerivedSizing;
  upgradeTotalStorageTB: number | null;
  storageSavingsTB: number;
  sobrBlocksUpgrade: boolean;
}

type Tier = keyof GfsBuckets;

const LEGEND_ORDER: Tier[] = ["yearly", "monthly", "weekly", "daily"];

const LEGEND_LABEL: Record<Tier, string> = {
  yearly: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
};

const LEGEND_COLOR: Record<Tier, string> = {
  yearly: "var(--chart-5)",
  monthly: "var(--chart-3)",
  weekly: "var(--chart-2)",
  daily: "var(--chart-1)",
};

/**
 * Stagger times the legend cells to the *tail* of the bar fill — labels
 * confirm a settled bar rather than racing alongside still-growing segments.
 * Bar starts at t=0 with --duration-slow (400ms); the first label fades in at
 * 300ms (~75% through the bar) and the last completes around 850ms.
 */
const LEGEND_DELAY_MS: Record<Tier, number> = {
  yearly: 300,
  monthly: 400,
  weekly: 500,
  daily: 600,
};

export function SizingHeroCard({
  sizing,
  upgradeTotalStorageTB,
  storageSavingsTB,
  sobrBlocksUpgrade,
}: SizingHeroCardProps) {
  const showUpgradeCaption =
    !sobrBlocksUpgrade &&
    upgradeTotalStorageTB !== null &&
    storageSavingsTB > 0;

  return (
    <Card className="border-t-primary bg-card-tint-success border-t-4 shadow-md">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Total Storage Required
          </p>
          <p
            aria-label={`Total storage required: ${formatTB(sizing.totalStorageTB)}`}
            className="text-primary motion-safe:animate-celebrate-in font-mono text-5xl tracking-tight tabular-nums sm:text-6xl lg:text-7xl"
          >
            {formatTB(sizing.totalStorageTB)}
          </p>

          {sobrBlocksUpgrade ? (
            <p className="text-muted-foreground motion-safe:animate-in motion-safe:fade-in fill-mode-backwards text-sm motion-safe:delay-300">
              VBR 13 storage savings only apply when Vault is targeted directly
              (via backup or Backup Copy jobs). SOBR Capacity Tier still uses
              VBR 12 sizing in VBR 13.0.0/13.0.1.
            </p>
          ) : (
            showUpgradeCaption && (
              <p className="text-muted-foreground motion-safe:animate-in motion-safe:fade-in fill-mode-backwards text-sm motion-safe:delay-300">
                Upgrade to VBR 13 could reduce this to{" "}
                <span className="font-mono">
                  {formatTB(upgradeTotalStorageTB)}
                </span>{" "}
                (saving {formatTB(storageSavingsTB)})
              </p>
            )
          )}
        </div>

        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Composition by retention tier
          </p>
          <SizingProportionBar
            buckets={sizing.gfsBuckets}
            sumTB={sizing.gfsSumTB}
            counts={sizing.gfsBucketCounts}
          />

          {sizing.gfsSumTB > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LEGEND_ORDER.map((tier) => (
                  <div
                    key={tier}
                    className="motion-safe:animate-in motion-safe:fade-in fill-mode-backwards flex items-baseline gap-2 motion-safe:duration-[var(--duration-normal)]"
                    style={{ animationDelay: `${LEGEND_DELAY_MS[tier]}ms` }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-sm"
                      style={{ backgroundColor: LEGEND_COLOR[tier] }}
                    />
                    <span className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase">
                        {LEGEND_LABEL[tier]}
                      </span>
                      <span className="font-mono text-base tabular-nums sm:text-lg">
                        {formatTB(sizing.gfsBuckets[tier])}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground text-xs">
                {formatTB(sizing.gfsSumTB)} across {sizing.gfsRestorePointCount}{" "}
                restore points
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
