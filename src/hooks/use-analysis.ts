import { useCallback, useRef, useState } from "react";
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

function errorState(error: string): AnalysisState {
  return { status: "error", data: null, validations: null, error };
}

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
  const requestIdRef = useRef(0);

  const analyzeFile = useCallback(async (file: File) => {
    const currentRequestId = ++requestIdRef.current;
    const isStale = () => requestIdRef.current !== currentRequestId;

    setState({
      status: "processing",
      data: null,
      validations: null,
      error: null,
    });

    try {
      const text = await readFileAsText(file);
      if (isStale()) return;

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        if (isStale()) return;
        setState(
          errorState(
            "Invalid JSON: The file does not contain valid JSON. Please check the file and try again.",
          ),
        );
        return;
      }

      if (typeof json !== "object" || json === null || !("Sections" in json)) {
        if (isStale()) return;
        setState(
          errorState(
            "Invalid Veeam Healthcheck export: The uploaded JSON does not have the expected structure. Please upload a Veeam Healthcheck export file.",
          ),
        );
        return;
      }

      const result = analyzeHealthcheck(
        json as Parameters<typeof analyzeHealthcheck>[0],
      );
      if (isStale()) return;

      setState({
        status: "success",
        data: result.data,
        validations: result.validations,
        error: null,
      });
    } catch (err) {
      if (isStale()) return;
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setState(errorState(message));
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current++;
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
