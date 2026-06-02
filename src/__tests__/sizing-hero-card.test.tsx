import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SizingHeroCard } from "@/components/dashboard/sizing-hero-card";
import type { DerivedSizing } from "@/lib/sizing-derivation";

const TOTAL = 38.0625 + 2.625; // gfs + immutability
const SIZING: DerivedSizing = {
  totalStorageTB: 38.06,
  initialFullTB: 5.25,
  dailyIncrementalTB: 0.2625,
  gfsBuckets: { daily: 7.875, weekly: 1.05, monthly: 14.4375, yearly: 14.7 },
  gfsSumTB: 38.0625,
  gfsRestorePointCount: 48,
  gfsBucketCounts: { daily: 30, weekly: 4, monthly: 11, yearly: 3 },
  performanceTaxGB: 2688,
  performanceTaxTB: 2.625,
  compositionBuckets: {
    daily: 7.875,
    weekly: 1.05,
    monthly: 14.4375,
    yearly: 14.7,
    immutability: 2.625,
    buffer: 0,
  },
  compositionTotalTB: TOTAL,
  compositionProportions: {
    daily: 7.875 / TOTAL,
    weekly: 1.05 / TOTAL,
    monthly: 14.4375 / TOTAL,
    yearly: 14.7 / TOTAL,
    immutability: 2.625 / TOTAL,
    buffer: 0,
  },
};

const BUFFER_TB = 4.0;
const TOTAL_WITH_BUFFER = TOTAL + BUFFER_TB;
const SIZING_WITH_BUFFER: DerivedSizing = {
  ...SIZING,
  totalStorageTB: SIZING.totalStorageTB + BUFFER_TB,
  compositionBuckets: {
    ...SIZING.compositionBuckets,
    buffer: BUFFER_TB,
  },
  compositionTotalTB: TOTAL_WITH_BUFFER,
  compositionProportions: {
    daily: SIZING.compositionBuckets.daily / TOTAL_WITH_BUFFER,
    weekly: SIZING.compositionBuckets.weekly / TOTAL_WITH_BUFFER,
    monthly: SIZING.compositionBuckets.monthly / TOTAL_WITH_BUFFER,
    yearly: SIZING.compositionBuckets.yearly / TOTAL_WITH_BUFFER,
    immutability: SIZING.compositionBuckets.immutability / TOTAL_WITH_BUFFER,
    buffer: BUFFER_TB / TOTAL_WITH_BUFFER,
  },
};

function renderDefault(overrides?: {
  comparisonTotalStorageTB?: number | null;
  upgradePerfTaxGB?: number | null;
  immutabilitySavingsGB?: number;
  sobrBlocksUpgrade?: boolean;
  sizing?: DerivedSizing;
  bufferPercent?: number;
  showAsV13?: boolean;
}) {
  return render(
    <SizingHeroCard
      sizing={overrides?.sizing ?? SIZING}
      comparisonTotalStorageTB={overrides?.comparisonTotalStorageTB ?? null}
      upgradePerfTaxGB={overrides?.upgradePerfTaxGB ?? null}
      immutabilitySavingsGB={overrides?.immutabilitySavingsGB ?? 0}
      sobrBlocksUpgrade={overrides?.sobrBlocksUpgrade ?? false}
      bufferPercent={overrides?.bufferPercent}
      showAsV13={overrides?.showAsV13 ?? false}
    />,
  );
}

describe("SizingHeroCard", () => {
  it("renders the hero metric prominently", () => {
    renderDefault();
    expect(screen.getByText("38.06 TB")).toBeInTheDocument();
  });

  it("hides the upgrade caption when savings <= 0", () => {
    renderDefault();
    expect(
      screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
    ).not.toBeInTheDocument();
  });

  it("shows the upgrade caption when savings > 0", () => {
    // savings = |38.06 - 32.5| = 5.56 TB, computed internally
    renderDefault({ comparisonTotalStorageTB: 32.5 });
    expect(
      screen.getByText(/upgrade to VBR 13 could reduce this to/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/32\.50 TB/)).toBeInTheDocument();
  });

  it("shows the SOBR-aware actionable copy when sobrBlocksUpgrade and savings > 0", () => {
    renderDefault({
      comparisonTotalStorageTB: 32.5,
      sobrBlocksUpgrade: true,
    });
    expect(
      screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
    ).not.toBeInTheDocument();
    // The legacy static disclaimer is removed.
    expect(
      screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Potentially save/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /by upgrading to VBR 13 and transitioning SOBRs to direct Backup Copy jobs\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/5\.56 TB/)).toBeInTheDocument();
  });

  it("hides the SOBR-aware caption when no savings to surface", () => {
    // comparisonTotalStorageTB === SIZING.totalStorageTB → savings = 0
    renderDefault({
      comparisonTotalStorageTB: 38.06,
      sobrBlocksUpgrade: true,
    });
    expect(screen.queryByText(/Potentially save/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
    ).not.toBeInTheDocument();
  });

  it("decorates the card frame with a top accent border", () => {
    const { container } = renderDefault();
    const frame = container.querySelector(".border-t-4.border-t-primary");
    expect(frame).not.toBeNull();
  });

  it("renders five legend items including Immutability Overhead", () => {
    renderDefault();
    expect(screen.getByText(/Yearly/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly/)).toBeInTheDocument();
    expect(screen.getByText(/Weekly/)).toBeInTheDocument();
    expect(screen.getByText(/Daily/)).toBeInTheDocument();
    expect(screen.getByText(/Immutability Overhead/)).toBeInTheDocument();
  });

  it("describes the composition in the muted subtext", () => {
    renderDefault();
    expect(
      screen.getByText(
        /38\.06 TB across 48 restore points and 2\.63 TB of immutability overhead\./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the VBR 13 immutability annotation when savings > 0", () => {
    renderDefault({ upgradePerfTaxGB: 2400, immutabilitySavingsGB: 288 });
    expect(screen.getByText(/↓ VBR 13:/)).toBeInTheDocument();
  });

  it("hides the immutability annotation when savings <= 0", () => {
    renderDefault({ upgradePerfTaxGB: 2688, immutabilitySavingsGB: 0 });
    expect(screen.queryByText(/↓ VBR 13:/)).not.toBeInTheDocument();
  });

  it("still shows the immutability annotation under sobrBlocksUpgrade", () => {
    renderDefault({
      upgradePerfTaxGB: 2400,
      immutabilitySavingsGB: 288,
      sobrBlocksUpgrade: true,
    });
    expect(screen.getByText(/↓ VBR 13:/)).toBeInTheDocument();
  });

  it("renders a Buffer (Spare) legend cell when buffer > 0", () => {
    renderDefault({ sizing: SIZING_WITH_BUFFER });
    expect(screen.getByText(/Buffer \(Spare\)/i)).toBeInTheDocument();
  });

  it("does not render a Buffer legend cell when buffer is 0", () => {
    renderDefault();
    expect(screen.queryByText(/Buffer \(Spare\)/i)).not.toBeInTheDocument();
  });

  it("shows the buffer caption when bufferPercent is provided and buffer > 0", () => {
    renderDefault({ sizing: SIZING_WITH_BUFFER, bufferPercent: 10 });
    expect(
      screen.getByText(/Includes 10% spare-capacity buffer\./i),
    ).toBeInTheDocument();
  });

  it("does not show the buffer caption when buffer is 0 even if bufferPercent is provided", () => {
    renderDefault({ bufferPercent: 10 });
    expect(
      screen.queryByText(/spare-capacity buffer/i),
    ).not.toBeInTheDocument();
  });

  it("does not show the buffer caption when buffer > 0 but bufferPercent is not provided", () => {
    renderDefault({ sizing: SIZING_WITH_BUFFER });
    expect(
      screen.queryByText(/spare-capacity buffer/i),
    ).not.toBeInTheDocument();
  });

  it("uses md:grid-cols-6 for legend grid when buffer > 0", () => {
    const { container } = renderDefault({ sizing: SIZING_WITH_BUFFER });
    const grid = container.querySelector(".md\\:grid-cols-6");
    expect(grid).not.toBeNull();
  });

  it("uses md:grid-cols-5 for legend grid when buffer is 0", () => {
    const { container } = renderDefault();
    const grid = container.querySelector(".md\\:grid-cols-5");
    expect(grid).not.toBeNull();
  });

  describe("showAsV13 mode", () => {
    it("shows the v13 caption (not the v12 upgrade caption) when showAsV13 is true and savings > 0", () => {
      // primary = v13 (38.06 TB), comparison = v12 (42.0 TB), savings = |38.06 - 42.0| = 3.94
      renderDefault({ comparisonTotalStorageTB: 42.0, showAsV13: true });
      expect(screen.getByText(/currently requires/i)).toBeInTheDocument();
      expect(screen.getByText(/42\.00 TB/)).toBeInTheDocument();
      expect(screen.getByText(/more without upgrading/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
    });

    it("does not show either caption when showAsV13 is true but savings is 0", () => {
      renderDefault({ comparisonTotalStorageTB: 38.06, showAsV13: true });
      expect(screen.queryByText(/currently requires/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
      ).not.toBeInTheDocument();
    });

    it("does not show the v13 caption when showAsV13 is false (default)", () => {
      renderDefault({ comparisonTotalStorageTB: 42.0 });
      expect(screen.queryByText(/currently requires/i)).not.toBeInTheDocument();
    });

    it("hides the v13 caption when v13 primary costs more than the v12 comparison", () => {
      // SIZING.totalStorageTB = 38.06 (v13 primary), comparison = 32.5 (v12, cheaper)
      // v13 costs MORE → no savings caption should appear
      renderDefault({ comparisonTotalStorageTB: 32.5, showAsV13: true });
      expect(screen.queryByText(/currently requires/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/more without upgrading/i),
      ).not.toBeInTheDocument();
    });

    it("does not show the SOBR caption when showAsV13 is true even with sobrBlocksUpgrade=true", () => {
      // Direct usage: both flags true simultaneously — only v13 caption should be eligible
      renderDefault({
        comparisonTotalStorageTB: 42.0,
        sobrBlocksUpgrade: true,
        showAsV13: true,
      });
      expect(screen.queryByText(/Potentially save/i)).not.toBeInTheDocument();
    });
  });

  it("hides the standard upgrade caption when the comparison (v13) costs more than the primary (v12)", () => {
    // SIZING.totalStorageTB = 38.06 (v12 primary), comparison = 42.0 (v13, more expensive)
    // upgrading would cost MORE → caption must not appear
    renderDefault({ comparisonTotalStorageTB: 42.0 });
    expect(
      screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
    ).not.toBeInTheDocument();
  });
});
