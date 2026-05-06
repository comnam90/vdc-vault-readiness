import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, type GlobalSettings } from "@/types/settings";

export const STORAGE_KEY = "vdc-vault-readiness:settings";

type Listener = () => void;
const listeners = new Set<Listener>();

function safeReadStorage(): GlobalSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let cached: GlobalSettings = safeReadStorage();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = safeReadStorage();
    notify();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
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
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
