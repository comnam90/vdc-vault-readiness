import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@/types/settings";
import {
  STORAGE_KEY,
  __resetSettingsStoreForTests,
  useSettings,
} from "@/hooks/use-settings";

describe("useSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetSettingsStoreForTests();
  });

  afterEach(() => {
    window.localStorage.clear();
    __resetSettingsStoreForTests();
  });

  it("initializes from DEFAULT_SETTINGS when localStorage is empty", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("initializes from localStorage when a valid value is present", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        targetCloud: "AWS",
        growthPercent: 12,
        growthYears: 3,
        limitCalculationYears: 1,
      }),
    );
    __resetSettingsStoreForTests();

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual({
      targetCloud: "AWS",
      growthPercent: 12,
      growthYears: 3,
      limitCalculationYears: 1,
    });
  });

  it("falls back to DEFAULT_SETTINGS when localStorage holds malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");
    __resetSettingsStoreForTests();

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial localStorage values with defaults so missing keys are filled in", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ targetCloud: "AWS" }),
    );
    __resetSettingsStoreForTests();

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      targetCloud: "AWS",
    });
  });

  it("updateSettings patches state and persists to localStorage", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ targetCloud: "AWS", growthPercent: 25 });
    });

    expect(result.current.settings.targetCloud).toBe("AWS");
    expect(result.current.settings.growthPercent).toBe(25);
    expect(result.current.settings.growthYears).toBe(0); // default preserved

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(persisted.targetCloud).toBe("AWS");
    expect(persisted.growthPercent).toBe(25);
  });

  it("propagates updates to multiple consumers of the hook", () => {
    const a = renderHook(() => useSettings());
    const b = renderHook(() => useSettings());

    act(() => {
      a.result.current.updateSettings({ limitCalculationYears: 2 });
    });

    expect(a.result.current.settings.limitCalculationYears).toBe(2);
    expect(b.result.current.settings.limitCalculationYears).toBe(2);
  });

  it("resetSettings restores DEFAULT_SETTINGS and persists them", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({
        targetCloud: "AWS",
        growthPercent: 10,
        growthYears: 5,
        limitCalculationYears: 3,
      });
    });
    expect(result.current.settings.targetCloud).toBe("AWS");

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(persisted).toEqual(DEFAULT_SETTINGS);
  });
});
