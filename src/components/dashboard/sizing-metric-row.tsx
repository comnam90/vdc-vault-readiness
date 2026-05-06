import type { ReactNode } from "react";

export interface SizingMetricRowProps {
  label: string;
  value: string;
  annotation?: ReactNode;
}

export function SizingMetricRow({
  label,
  value,
  annotation,
}: SizingMetricRowProps) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-3 py-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">
        {value}
        {annotation && (
          <span className="text-muted-foreground ml-2 font-sans text-xs font-normal">
            {annotation}
          </span>
        )}
      </span>
    </div>
  );
}
