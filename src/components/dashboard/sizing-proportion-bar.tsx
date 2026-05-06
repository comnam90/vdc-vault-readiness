import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTB } from "@/lib/format-utils";
import type { CompositionBuckets } from "@/lib/sizing-derivation";

export interface SizingProportionBarProps {
  buckets: CompositionBuckets;
  sumTB: number;
  counts: { daily: number; weekly: number; monthly: number; yearly: number };
}

type Segment = keyof CompositionBuckets;

const SEGMENT_ORDER: Segment[] = [
  "yearly",
  "monthly",
  "weekly",
  "daily",
  "immutability",
];

const SEGMENT_LABEL: Record<Segment, string> = {
  yearly: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
  immutability: "Immutability",
};

const SEGMENT_COLOR: Record<Segment, string> = {
  yearly: "var(--chart-5)",
  monthly: "var(--chart-3)",
  weekly: "var(--chart-2)",
  daily: "var(--chart-1)",
  immutability: "var(--chart-4)",
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
    SEGMENT_ORDER.map((seg) => {
      const fraction = buckets[seg] / sumTB;
      return `${SEGMENT_LABEL[seg]} ${formatTB(buckets[seg])} (${formatPct(fraction)})`;
    }).join(", ");

  return (
    <TooltipProvider>
      <div
        role="group"
        aria-label={ariaLabel}
        className="bg-muted relative flex h-3 w-full overflow-hidden rounded-full"
      >
        {SEGMENT_ORDER.map((seg) => {
          const fraction = buckets[seg] / sumTB;
          const targetPct = fraction * 100;
          const flexBasis = mounted ? `${targetPct}%` : "0%";
          const tooltipDetail =
            seg === "immutability"
              ? `${SEGMENT_LABEL[seg]} Overhead: ${formatTB(buckets[seg])} (${formatPct(fraction)})`
              : `${SEGMENT_LABEL[seg]}: ${formatTB(buckets[seg])} (${formatPct(fraction)}, ${counts[seg]} points)`;
          return (
            <Tooltip key={seg}>
              <TooltipTrigger asChild>
                <div
                  data-segment={seg}
                  className={cn(
                    "h-full",
                    "motion-safe:transition-[flex-basis] motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out)]",
                  )}
                  style={{
                    flexBasis,
                    backgroundColor: SEGMENT_COLOR[seg],
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{tooltipDetail}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
