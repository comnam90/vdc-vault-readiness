import { AlertCircle } from "lucide-react";
import { useAnalysis } from "@/hooks/use-analysis";
import { FileUpload } from "@/components/dashboard/file-upload";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ChecklistLoader } from "@/components/dashboard/checklist-loader";
import { ExperimentalBanner } from "@/components/dashboard/experimental-banner";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function App() {
  const {
    status,
    data,
    validations,
    error,
    completedSteps,
    currentStep,
    analyzeFile,
    reset,
  } = useAnalysis();

  return (
    <div
      data-testid="app-shell"
      className="flex min-h-screen flex-col bg-[var(--surface-gradient)]"
    >
      <ExperimentalBanner />
      <main className="flex flex-1 flex-col">
        {status === "processing" ? (
          <ChecklistLoader
            completedSteps={completedSteps}
            currentStep={currentStep}
          />
        ) : status === "error" ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 w-full max-w-md space-y-4 duration-400 ease-[var(--ease-out)]">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Analysis Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button variant="outline" onClick={reset}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : status === "success" && data && validations ? (
          <DashboardView
            data={data}
            validations={validations}
            onReset={reset}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 w-full max-w-lg duration-400 ease-[var(--ease-out)]">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight">
                  VDC Vault Readiness
                </h1>
                <p className="text-muted-foreground mt-2">
                  Upload your{" "}
                  <a
                    href="https://github.com/VeeamHub/veeam-healthcheck/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground underline underline-offset-4"
                  >
                    Veeam Healthcheck
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>{" "}
                  JSON to validate Vault compatibility
                </p>
                <p className="text-muted-foreground/60 mt-3 text-xs tracking-wide">
                  Checks VBR version, encryption, SOBR configuration, licensing,
                  and workload compatibility
                </p>
              </div>
              <FileUpload onFileSelected={analyzeFile} />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
