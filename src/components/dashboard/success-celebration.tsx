import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SuccessCelebrationProps {
  checksCount: number;
  onViewDetails: () => void;
}

const STAGGER_FADE =
  "motion-safe:animate-in motion-safe:fade-in fill-mode-backwards";

export function SuccessCelebration({
  checksCount,
  onViewDetails,
}: SuccessCelebrationProps) {
  return (
    <Card
      className={cn(STAGGER_FADE, "text-center duration-500")}
      role="status"
    >
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <div
          data-testid="success-icon-container"
          className="motion-safe:animate-success-ring bg-primary/10 flex size-16 items-center justify-center rounded-full"
        >
          <CheckCircle2 className="text-primary size-8" aria-hidden="true" />
          <span className="sr-only">Validation successful</span>
        </div>

        <h2
          className={cn(
            STAGGER_FADE,
            "text-2xl font-semibold delay-200 duration-300",
          )}
        >
          All Systems Ready
        </h2>

        <p
          className={cn(
            STAGGER_FADE,
            "text-muted-foreground delay-300 duration-300",
          )}
        >
          Your Veeam environment is fully compatible with VDC Vault.
          <br />
          All {checksCount} validation checks passed successfully.
        </p>

        <Button
          onClick={onViewDetails}
          variant="outline"
          className="motion-safe:animate-in motion-safe:slide-in-from-bottom-2 fill-mode-backwards delay-500 duration-300"
        >
          View Job Details
        </Button>
      </CardContent>
    </Card>
  );
}
