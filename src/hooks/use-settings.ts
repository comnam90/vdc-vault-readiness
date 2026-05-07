import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  type GlobalSettings,
  type TargetCloud,
} from "@/types/settings";

export const STORAGE_KEY = "vdc-vault-readiness:settings";

type Listener = () => void;

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeSettings(input: unknown): GlobalSettings {
  if (input === null || typeof input !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  const raw = input as Record<string, unknown>;

  const targetCloud: TargetCloud =
    raw.targetCloud === "AWS" || raw.targetCloud === "Azure"
      ? raw.targetCloud
      : DEFAULT_SETTINGS.targetCloud;

  const growthPercent = clampInt(
    raw.growthPercent,
    0,
    100,
    DEFAULT_SETTINGS.growthPercent,
  );
  const growthYears = clampInt(
    raw.growthYears,
    0,
    10,
    DEFAULT_SETTINGS.growthYears,
  );

  // null is a valid "disabled" state; otherwise must be an integer in [1, 10].
  let limitCalculationYears: number | null =
    DEFAULT_SETTINGS.limitCalculationYears;
  if (raw.limitCalculationYears === null) {
    limitCalculationYears = null;
  } else if (
    typeof raw.limitCalculationYears === "number" &&
    Number.isFinite(raw.limitCalculationYears) &&
    Number.isInteger(raw.limitCalculationYears) &&
    raw.limitCalculationYears >= 1 &&
    raw.limitCalculationYears <= 10
  ) {
    limitCalculationYears = raw.limitCalculationYears;
  }

  const ignoreArchiveTier =
    typeof raw.ignoreArchiveTier === "boolean"
      ? raw.ignoreArchiveTier
      : DEFAULT_SETTINGS.ignoreArchiveTier;

  const greenfieldSimulation =
    typeof raw.greenfieldSimulation === "boolean"
      ? raw.greenfieldSimulation
      : DEFAULT_SETTINGS.greenfieldSimulation;

  return {
    targetCloud,
    growthPercent,
    growthYears,
    limitCalculationYears,
    ignoreArchiveTier,
    greenfieldSimulation,
  };
}

function safeReadStorage(): GlobalSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let cached: GlobalSettings = safeReadStorage();
const listeners = new Set<Listener>();
let storageHandlerBound = false;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  cached = safeReadStorage();
  notify();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  if (!storageHandlerBound && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
    storageHandlerBound = true;
  }

  return () => {
    listeners.delete(listener);
    if (
      listeners.size === 0 &&
      storageHandlerBound &&
      typeof window !== "undefined"
    ) {
      window.removeEventListener("storage", handleStorageEvent);
      storageHandlerBound = false;
    }
  };
}

function getSnapshot(): GlobalSettings {
  return cached;
}

function writeStorage(value: GlobalSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy-mode errors; in-memory state still updates.
  }
}

function setSettings(next: GlobalSettings): void {
  cached = next;
  writeStorage(next);
  notify();
}

/**
 * Test-only escape hatch: re-reads localStorage into the module cache so each
 * test can set up a fresh starting point without reloading the module. Does
 * not notify listeners — call before mounting fresh hook consumers.
 */
export function __resetSettingsStoreForTests(): void {
  cached = safeReadStorage();
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const updateSettings = useCallback((patch: Partial<GlobalSettings>) => {
    setSettings({ ...cached, ...patch });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return { settings, updateSettings, resetSettings };
}
