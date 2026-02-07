import { AlertCircle } from "lucide-react";
import { useAnalysis } from "@/hooks/use-analysis";
import { FileUpload } from "@/components/dashboard/file-upload";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ChecklistLoader } from "@/components/dashboard/checklist-loader";
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

  if (status === "processing") {
    return (
      <ChecklistLoader
        completedSteps={completedSteps}
        currentStep={currentStep}
      />
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 w-full max-w-md space-y-4 duration-400">
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
    );
  }

  if (status === "success" && data && validations) {
    return (
      <DashboardView data={data} validations={validations} onReset={reset} />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 w-full max-w-lg duration-400">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            VDC Vault Readiness
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload your Veeam Healthcheck JSON to validate Vault compatibility
          </p>
        </div>
        <FileUpload onFileSelected={analyzeFile} />
      </div>
    </div>
  );
}

export default App;
