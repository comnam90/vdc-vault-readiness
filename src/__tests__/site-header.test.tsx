import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/dashboard/site-header";
import { __resetSettingsStoreForTests } from "@/hooks/use-settings";

describe("SiteHeader", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetSettingsStoreForTests();
  });

  afterEach(() => {
    window.localStorage.clear();
    __resetSettingsStoreForTests();
  });

  it("renders title, Scan Complete badge, settings button, and Upload New button", () => {
    render(<SiteHeader onReset={vi.fn()} />);

    expect(screen.getByText("VDC Vault Readiness")).toBeInTheDocument();
    expect(screen.getByText("Scan Complete")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload new/i }),
    ).toBeInTheDocument();
  });

  it("invokes onReset when Upload New is clicked", () => {
    const onReset = vi.fn();
    render(<SiteHeader onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: /upload new/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("opens the settings dialog when the settings button is clicked", () => {
    render(<SiteHeader onReset={vi.fn()} />);

    expect(
      screen.queryByRole("heading", { name: /global settings/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));

    expect(
      screen.getByRole("heading", { name: /global settings/i }),
    ).toBeInTheDocument();
  });
});
