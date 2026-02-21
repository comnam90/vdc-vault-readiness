import { Badge } from "@/components/ui/badge";
import { formatTB } from "@/lib/format-utils";

export function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

export function FreeSpaceValue({
  tb,
  percent,
}: {
  tb: number | null;
  percent: number | null;
}) {
  if (tb === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const formatted = formatTB(tb);
  const pctLabel = percent !== null ? ` (${percent.toFixed(0)}%)` : "";

  if (percent !== null && percent < 15) {
    return (
      <span className="text-destructive">
        {formatted}
        {pctLabel}
      </span>
    );
  }
  if (percent !== null && percent < 30) {
    return (
      <span className="text-warning">
        {formatted}
        {pctLabel}
      </span>
    );
  }
  return (
    <span className="text-primary">
      {formatted}
      {pctLabel}
    </span>
  );
}

export function BoolBadge({
  value,
  trueLabel = "Enabled",
  falseLabel = "Disabled",
}: {
  value: boolean | null;
  trueLabel?: string;
  falseLabel?: string;
}) {
  if (value === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return value ? (
    <Badge
      variant="outline"
      className="border-primary/30 bg-primary/5 text-primary"
    >
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {falseLabel}
    </Badge>
  );
}
