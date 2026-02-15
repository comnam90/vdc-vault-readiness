import { FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ExperimentalBanner() {
  return (
    <Alert className="motion-safe:animate-in motion-safe:fade-in rounded-none border-x-0 border-t-0 duration-400">
      <FlaskConical className="size-4" aria-hidden="true" />
      <AlertTitle>Experimental</AlertTitle>
      <AlertDescription>
        This tool is under active development. Features may change or be
        incomplete.
      </AlertDescription>
    </Alert>
  );
}
