import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTB } from "@/lib/format-utils";
import type { GfsBuckets } from "@/lib/sizing-derivation";

export interface SizingProportionBarProps {
  buckets: GfsBuckets;
  sumTB: number;
  counts: { daily: number; weekly: number; monthly: number; yearly: number };
}

type Tier = keyof GfsBuckets;

const TIER_ORDER: Tier[] = ["yearly", "monthly", "weekly", "daily"];

const TIER_LABEL: Record<Tier, string> = {
  yearly: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
};

const TIER_COLOR: Record<Tier, string> = {
  yearly: "var(--chart-5)",
  monthly: "var(--chart-3)",
  weekly: "var(--chart-2)",
  daily: "var(--chart-1)",
};

function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function SizingProportionBar({
  buckets,
  sumTB,
  counts,
}: SizingProportionBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (sumTB <= 0) {
    return (
      <p className="text-muted-foreground text-sm italic">
        Restore-point breakdown unavailable
      </p>
    );
  }

  const ariaLabel =
    "Retention composition: " +
    TIER_ORDER.map((tier) => {
      const fraction = buckets[tier] / sumTB;
      return `${TIER_LABEL[tier]} ${formatTB(buckets[tier])} (${formatPct(fraction)})`;
    }).join(", ");

  return (
    <TooltipProvider>
      <div
        role="group"
        aria-label={ariaLabel}
        className="bg-muted relative flex h-3 w-full overflow-hidden rounded-full"
      >
        {TIER_ORDER.map((tier) => {
          const fraction = buckets[tier] / sumTB;
          const targetPct = fraction * 100;
          const flexBasis = mounted ? `${targetPct}%` : "0%";
          return (
            <Tooltip key={tier}>
              <TooltipTrigger asChild>
                <div
                  data-segment={tier}
                  className={cn(
                    "h-full",
                    "motion-safe:transition-[flex-basis] motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out)]",
                  )}
                  style={{
                    flexBasis,
                    backgroundColor: TIER_COLOR[tier],
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {TIER_LABEL[tier]}: {formatTB(buckets[tier])} (
                {formatPct(fraction)}, {counts[tier]} points)
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
