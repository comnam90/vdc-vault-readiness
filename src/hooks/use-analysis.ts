import { useCallback, useRef, useState } from "react";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import { analyzeHealthcheck } from "@/lib/pipeline";
import { PIPELINE_STEPS } from "@/lib/constants";

export type AnalysisStatus = "idle" | "processing" | "success" | "error";

interface AnalysisState {
  status: AnalysisStatus;
  data: NormalizedDataset | null;
  validations: ValidationResult[] | null;
  error: string | null;
  completedSteps: string[];
  currentStep: string | null;
}

const INITIAL_STATE: AnalysisState = {
  status: "idle",
  data: null,
  validations: null,
  error: null,
  completedSteps: [],
  currentStep: null,
};

const DEFAULT_STEP_DELAY = 400;

function errorState(error: string): AnalysisState {
  return {
    status: "error",
    data: null,
    validations: null,
    error,
    completedSteps: [],
    currentStep: null,
  };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

function tick(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const idHolder: { current: ReturnType<typeof setTimeout> | undefined } = {
      current: undefined,
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const onAbort = () => {
      if (idHolder.current !== undefined) {
        clearTimeout(idHolder.current);
      }
      signal.removeEventListener("abort", onAbort);
      finish();
    };

    signal.addEventListener("abort", onAbort, { once: true });

    if (signal.aborted) {
      signal.removeEventListener("abort", onAbort);
      settled = true;
      resolve();
      return;
    }

    idHolder.current = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      finish();
    }, ms);
  });
}

interface UseAnalysisOptions {
  stepDelay?: number;
}

export function useAnalysis({
  stepDelay = DEFAULT_STEP_DELAY,
}: UseAnalysisOptions = {}) {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController>(new AbortController());

  const analyzeFile = useCallback(
    async (file: File) => {
      abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentRequestId = ++requestIdRef.current;
      const isStale = () => requestIdRef.current !== currentRequestId;

      setState({
        status: "processing",
        data: null,
        validations: null,
        error: null,
        completedSteps: [],
        currentStep: PIPELINE_STEPS[0].id,
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

        if (
          typeof json !== "object" ||
          json === null ||
          !("Sections" in json)
        ) {
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

        // Parse step complete. Tick through validation steps.
        for (let i = 1; i <= PIPELINE_STEPS.length; i++) {
          const completed = PIPELINE_STEPS.slice(0, i).map((s) => s.id);
          const next = i < PIPELINE_STEPS.length ? PIPELINE_STEPS[i].id : null;

          setState((prev) => ({
            ...prev,
            completedSteps: completed,
            currentStep: next,
          }));

          await tick(stepDelay, controller.signal);
          if (isStale()) return;
        }

        setState({
          status: "success",
          data: result.data,
          validations: result.validations,
          error: null,
          completedSteps: PIPELINE_STEPS.map((s) => s.id),
          currentStep: null,
        });
      } catch (err) {
        if (isStale()) return;
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setState(errorState(message));
      }
    },
    [stepDelay],
  );

  const reset = useCallback(() => {
    abortRef.current.abort();
    requestIdRef.current++;
    setState(INITIAL_STATE);
  }, []);

  return {
    status: state.status,
    data: state.data,
    validations: state.validations,
    error: state.error,
    completedSteps: state.completedSteps,
    currentStep: state.currentStep,
    analyzeFile,
    reset,
  };
}
