import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SettingsDialog } from "@/components/dashboard/settings-dialog";
import { DEFAULT_SETTINGS } from "@/types/settings";
import {
  STORAGE_KEY,
  __resetSettingsStoreForTests,
  useSettings,
} from "@/hooks/use-settings";

function clearStore() {
  window.localStorage.clear();
  __resetSettingsStoreForTests();
}

function setNumberInput(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe("SettingsDialog", () => {
  beforeEach(() => {
    clearStore();
  });

  afterEach(() => {
    clearStore();
  });

  it("renders dialog title and primary controls when open", () => {
    render(<SettingsDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /global settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /azure/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /aws/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/growth %/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/growth years/i)).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /cap retention horizon/i }),
    ).toBeInTheDocument();
  });

  it("does not show the retention year input when the cap switch is off (default)", () => {
    render(<SettingsDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByLabelText(/^years$/i)).not.toBeInTheDocument();
  });

  it("reveals the retention year and month inputs when the cap switch is toggled on", () => {
    render(<SettingsDialog open onOpenChange={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("switch", { name: /cap retention horizon/i }),
    );

    const yearsInput = screen.getByLabelText(/^years$/i) as HTMLInputElement;
    expect(yearsInput).toBeInTheDocument();
    expect(yearsInput.value).toBe("1");

    const monthsInput = screen.getByLabelText(/^months$/i) as HTMLInputElement;
    expect(monthsInput).toBeInTheDocument();
    expect(monthsInput.value).toBe("0");
  });

  it("persists both retention years and months via Save", () => {
    const onOpenChange = vi.fn();
    render(<SettingsDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(
      screen.getByRole("switch", { name: /cap retention horizon/i }),
    );

    setNumberInput(screen.getByLabelText(/^years$/i) as HTMLInputElement, "2");
    setNumberInput(screen.getByLabelText(/^months$/i) as HTMLInputElement, "6");
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(persisted.limitCalculationYears).toBe(2);
    expect(persisted.limitCalculationMonths).toBe(6);
  });

  it("Save commits the draft into the settings store and closes the dialog", () => {
    const onOpenChange = vi.fn();
    render(<SettingsDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /aws/i }));

    setNumberInput(
      screen.getByLabelText(/growth %/i) as HTMLInputElement,
      "12",
    );
    setNumberInput(
      screen.getByLabelText(/growth years/i) as HTMLInputElement,
      "3",
    );

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(persisted.targetCloud).toBe("AWS");
    expect(persisted.growthPercent).toBe(12);
    expect(persisted.growthYears).toBe(3);
  });

  it("Cancel discards the draft without persisting changes", () => {
    const onOpenChange = vi.fn();
    render(<SettingsDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /aws/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("Reset to defaults updates the form but does not persist until Save", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        targetCloud: "AWS",
        growthPercent: 25,
        growthYears: 4,
        limitCalculationYears: 2,
      }),
    );
    __resetSettingsStoreForTests();

    render(<SettingsDialog open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));

    expect((screen.getByLabelText(/growth %/i) as HTMLInputElement).value).toBe(
      "0",
    );
    expect(
      (screen.getByLabelText(/growth years/i) as HTMLInputElement).value,
    ).toBe("0");
    const switchEl = screen.getByRole("switch", {
      name: /cap retention horizon/i,
    });
    expect(switchEl.getAttribute("aria-checked")).toBe("false");

    // localStorage still holds the prior value (not persisted yet)
    const stillPersisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(stillPersisted.targetCloud).toBe("AWS");

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    const finalPersisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(finalPersisted).toEqual(DEFAULT_SETTINGS);
  });

  it("shows the historical-data input when greenfield is on (default) and hides it when toggled off", () => {
    render(<SettingsDialog open onOpenChange={vi.fn()} />);

    const historicalInput = screen.getByLabelText(
      /historical data \(years\)/i,
    ) as HTMLInputElement;
    expect(historicalInput).toBeInTheDocument();
    expect(historicalInput.value).toBe("0");

    fireEvent.click(
      screen.getByRole("switch", { name: /simulate greenfield growth/i }),
    );
    expect(
      screen.queryByLabelText(/historical data \(years\)/i),
    ).not.toBeInTheDocument();
  });

  it("persists historicalDataYears via Save", () => {
    const onOpenChange = vi.fn();
    render(<SettingsDialog open onOpenChange={onOpenChange} />);

    setNumberInput(
      screen.getByLabelText(/historical data \(years\)/i) as HTMLInputElement,
      "4",
    );
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(persisted.historicalDataYears).toBe(4);
  });

  it("seeds the draft from current settings when the dialog opens", () => {
    function Harness({ open }: { open: boolean }) {
      const { updateSettings } = useSettings();
      return (
        <>
          <button onClick={() => updateSettings({ targetCloud: "AWS" })}>
            update
          </button>
          <SettingsDialog open={open} onOpenChange={vi.fn()} />
        </>
      );
    }

    const { rerender } = render(<Harness open={false} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /update/i }));
    });

    rerender(<Harness open />);

    expect(screen.getByRole("radio", { name: /aws/i })).toBeChecked();
  });
});
