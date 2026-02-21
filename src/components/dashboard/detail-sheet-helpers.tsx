import { Badge } from "@/components/ui/badge";

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
