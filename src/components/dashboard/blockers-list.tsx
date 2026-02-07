import { CircleX, TriangleAlert } from "lucide-react";
import type { ValidationResult } from "@/types/validation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BlockersListProps {
  validations: ValidationResult[];
}

const MAX_VISIBLE_ITEMS = 5;

const SEVERITY = {
  fail: {
    border: "border-l-destructive/30 bg-destructive/5",
    Icon: CircleX,
    iconColor: "text-destructive",
    badgeVariant: "destructive" as const,
    badgeClass: "",
    badgeLabel: "Blocker",
  },
  warning: {
    border: "border-l-warning/30 bg-warning/5",
    Icon: TriangleAlert,
    iconColor: "text-warning",
    badgeVariant: "outline" as const,
    badgeClass: "border-warning text-warning",
    badgeLabel: "Warning",
  },
};

export function BlockersList({ validations }: BlockersListProps) {
  const blockers = validations
    .filter((v) => v.status === "fail" || v.status === "warning")
    .sort((a, b) => {
      if (a.status === "fail" && b.status !== "fail") return -1;
      if (a.status !== "fail" && b.status === "fail") return 1;
      return 0;
    });

  return (
    <div data-testid="blockers-list" className="space-y-3">
      {blockers.map((blocker) => {
        const isFail = blocker.status === "fail";
        const sev = SEVERITY[isFail ? "fail" : "warning"];
        const remaining = blocker.affectedItems.length - MAX_VISIBLE_ITEMS;
        const visibleItems = blocker.affectedItems.slice(0, MAX_VISIBLE_ITEMS);

        return (
          <div
            key={blocker.ruleId}
            role="alert"
            className={cn(
              "animate-in fade-in rounded-lg border-l-4 p-4 duration-300",
              sev.border,
              isFail && "animate-attention-pulse",
            )}
          >
            <div className="flex items-start gap-3">
              <sev.Icon
                className={cn("mt-0.5 size-5 shrink-0", sev.iconColor)}
                aria-hidden="true"
              />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3
                    data-testid="blocker-title"
                    className="text-sm font-bold tracking-wide uppercase"
                  >
                    {blocker.title}
                  </h3>
                  <Badge
                    variant={sev.badgeVariant}
                    className={cn(
                      "text-[10px] tracking-wider uppercase",
                      sev.badgeClass,
                    )}
                  >
                    {sev.badgeLabel}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {blocker.message}
                </p>
                {visibleItems.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm">
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
