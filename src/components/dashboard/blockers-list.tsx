import { CircleX, TriangleAlert } from "lucide-react";
import type { ValidationResult } from "@/types/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BlockersListProps {
  blockers: ValidationResult[];
}

const MAX_VISIBLE_ITEMS = 5;
const STAGGER_DELAY_MS = 100;

const SEVERITY = {
  fail: {
    alertClass:
      "border-l-4 border-l-destructive/30 bg-destructive/5 motion-safe:animate-attention-pulse",
    Icon: CircleX,
    iconClass: "text-destructive !size-5",
    badgeVariant: "destructive" as const,
    badgeClass: "",
    badgeLabel: "Blocker",
  },
  warning: {
    alertClass: "border-l-4 border-l-warning/30 bg-warning/5",
    Icon: TriangleAlert,
    iconClass: "text-warning !size-5",
    badgeVariant: "outline" as const,
    badgeClass: "border-warning text-warning",
    badgeLabel: "Warning",
  },
};

export function BlockersList({ blockers }: BlockersListProps) {
  return (
    <div data-testid="blockers-list" className="space-y-3">
      {blockers.map((blocker, index) => {
        const isFail = blocker.status === "fail";
        const sev = SEVERITY[isFail ? "fail" : "warning"];
        const remaining = blocker.affectedItems.length - MAX_VISIBLE_ITEMS;
        const visibleItems = blocker.affectedItems.slice(0, MAX_VISIBLE_ITEMS);

        return (
          <Alert
            key={blocker.ruleId}
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in fill-mode-backwards duration-300",
              sev.alertClass,
            )}
            style={{ animationDelay: `${index * STAGGER_DELAY_MS}ms` }}
          >
            <sev.Icon className={sev.iconClass} aria-hidden="true" />
            <AlertTitle data-testid="blocker-title">
              <span className="text-sm font-bold tracking-wide uppercase">
                {blocker.title}
              </span>
              <Badge
                variant={sev.badgeVariant}
                className={cn(
                  "ml-2 align-middle text-[10px] tracking-wider uppercase",
                  sev.badgeClass,
                )}
              >
                {sev.badgeLabel}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p>{blocker.message}</p>
              {visibleItems.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-0.5">
                  {visibleItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {remaining > 0 && (
                    <li className="text-muted-foreground">
                      and {remaining} more
                    </li>
                  )}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
