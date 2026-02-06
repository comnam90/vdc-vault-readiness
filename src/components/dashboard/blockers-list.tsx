import { AlertCircle, AlertTriangle } from "lucide-react";
import type { ValidationResult } from "@/types/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
          <Alert
            key={blocker.ruleId}
            variant={isFail ? "destructive" : "default"}
            className={cn(
              !isFail && "border-yellow-500 text-yellow-700",
            )}
          >
            {isFail ? (
              <AlertCircle className="size-4" />
            ) : (
              <AlertTriangle className="size-4" />
            )}
            <AlertTitle data-testid="blocker-title">
              {blocker.title}
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
