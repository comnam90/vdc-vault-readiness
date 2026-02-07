import { CircleX, TriangleAlert } from "lucide-react";
import type { ValidationResult } from "@/types/validation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BlockersListProps {
  validations: ValidationResult[];
}

const MAX_VISIBLE_ITEMS = 5;

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
        const remaining = blocker.affectedItems.length - MAX_VISIBLE_ITEMS;
        const visibleItems = blocker.affectedItems.slice(0, MAX_VISIBLE_ITEMS);

        return (
          <div
            key={blocker.ruleId}
            className={cn(
              "rounded-lg border-l-4 p-4",
              isFail
                ? "border-l-destructive/30 bg-destructive/5"
                : "border-l-warning/30 bg-warning/5",
            )}
          >
            <div className="flex items-start gap-3">
              {isFail ? (
                <CircleX
                  className="text-destructive mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <TriangleAlert
                  className="text-warning mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3
                    data-testid="blocker-title"
                    className="text-sm font-bold tracking-wide uppercase"
                  >
                    {blocker.title}
                  </h3>
                  {isFail ? (
                    <Badge
                      variant="destructive"
                      className="text-[10px] tracking-wider uppercase"
                    >
                      Blocker
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-warning text-warning text-[10px] tracking-wider uppercase"
                    >
                      Warning
                    </Badge>
                  )}
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
