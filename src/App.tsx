import { AlertCircle, Loader2 } from "lucide-react";
import { useAnalysis } from "@/hooks/use-analysis";
import { FileUpload } from "@/components/dashboard/file-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function App() {
  const { status, validations, error, analyzeFile, reset } = useAnalysis();

  if (status === "processing") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            Analyzing...
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
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

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold text-green-600">
            Analysis Complete!
          </h2>
          <p className="text-muted-foreground">
            {validations?.length} validation rules ran.
          </p>
          <Button onClick={reset}>Upload Another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            VDC Vault Readiness
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upload your Veeam Healthcheck JSON to validate Vault compatibility
          </p>
        </div>
        <FileUpload onFileSelected={analyzeFile} />
      </div>
    </div>
  );
}

export default App;
