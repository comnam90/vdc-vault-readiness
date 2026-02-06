import { useCallback, useState } from "react";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import { analyzeHealthcheck } from "@/lib/pipeline";

export type AnalysisStatus = "idle" | "processing" | "success" | "error";

interface AnalysisState {
  status: AnalysisStatus;
  data: NormalizedDataset | null;
  validations: ValidationResult[] | null;
  error: string | null;
}

const INITIAL_STATE: AnalysisState = {
  status: "idle",
  data: null,
  validations: null,
  error: null,
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);

  const analyzeFile = useCallback(async (file: File) => {
    setState({
      status: "processing",
      data: null,
      validations: null,
      error: null,
    });

    try {
      const text = await readFileAsText(file);

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setState({
          status: "error",
          data: null,
          validations: null,
          error: "Invalid JSON: The file does not contain valid JSON. Please check the file and try again.",
        });
        return;
      }

      const result = analyzeHealthcheck(json as Parameters<typeof analyzeHealthcheck>[0]);
      setState({
        status: "success",
        data: result.data,
        validations: result.validations,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setState({
        status: "error",
        data: null,
        validations: null,
        error: message,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    status: state.status,
    data: state.data,
    validations: state.validations,
    error: state.error,
    analyzeFile,
    reset,
  };
}
