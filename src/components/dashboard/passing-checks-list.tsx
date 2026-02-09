import { CheckCircle2 } from "lucide-react";
import type { ValidationResult } from "@/types/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PassingChecksListProps {
  validations: ValidationResult[];
  blockerCount?: number;
}

const STAGGER_DELAY_MS = 100;

export function PassingChecksList({
  validations,
  blockerCount = 0,
}: PassingChecksListProps) {
  const passing = validations.filter((v) => v.status === "pass");

  if (passing.length === 0) {
    return null;
  }

  return (
    <div data-testid="passing-checks" className="space-y-3">
      <h3 className="text-muted-foreground text-sm font-medium">
        {passing.length} {passing.length === 1 ? "check" : "checks"} passed
      </h3>

      {passing.map((check, index) => (
        <Alert
          key={check.ruleId}
          className={cn(
            "motion-safe:animate-in motion-safe:fade-in fill-mode-backwards duration-300",
            "border-l-primary/30 bg-primary/5 border-l-4",
          )}
          style={{
            animationDelay: `${(blockerCount + index) * STAGGER_DELAY_MS}ms`,
          }}
        >
          <CheckCircle2 className="text-primary !size-5" aria-hidden="true" />
          <AlertTitle>
            <span className="text-sm font-bold tracking-wide uppercase">
              {check.title}
            </span>
            <Badge
              variant="outline"
              className="border-primary text-primary ml-2 align-middle text-[10px] tracking-wider uppercase"
            >
              Passed
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <p>{check.message}</p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
