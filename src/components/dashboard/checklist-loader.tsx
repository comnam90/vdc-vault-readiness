import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { PIPELINE_STEPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ChecklistLoaderProps {
  completedSteps: string[];
  currentStep: string | null;
}

export function ChecklistLoader({
  completedSteps,
  currentStep,
}: ChecklistLoaderProps) {
  const completedCount = completedSteps.length;
  const totalSteps = PIPELINE_STEPS.length;
  const progress = Math.round((completedCount / totalSteps) * 100);

  const currentLabel = currentStep
    ? `${PIPELINE_STEPS.find((s) => s.id === currentStep)?.label ?? "Processing"}...`
    : "Finalizing...";

  return (
    <div
      className="motion-safe:animate-in motion-safe:fade-in flex min-h-screen items-center justify-center p-8 duration-400"
      data-testid="checklist-loader"
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm font-medium">
              {currentLabel}
            </p>
            <span className="text-muted-foreground font-mono text-xs">
              {progress}%
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Steps checklist */}
        <ul className="space-y-3" aria-label="Validation steps">
          {PIPELINE_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;

            return (
              <li key={step.id} className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2
                    className="text-primary size-5 shrink-0"
                    aria-hidden="true"
                  />
                ) : isCurrent ? (
                  <Loader2
                    className="text-primary size-5 shrink-0 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="text-muted-foreground/40 size-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "font-mono text-sm",
                    isCompleted && "text-foreground",
                    isCurrent && "text-foreground font-medium",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
