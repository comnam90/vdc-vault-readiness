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
  },
  compositionTotalTB: TOTAL,
  compositionProportions: {
    daily: 7.875 / TOTAL,
    weekly: 1.05 / TOTAL,
    monthly: 14.4375 / TOTAL,
    yearly: 14.7 / TOTAL,
    immutability: 2.625 / TOTAL,
  },
};

function renderDefault(overrides?: {
  upgradeTotalStorageTB?: number | null;
  storageSavingsTB?: number;
  upgradePerfTaxGB?: number | null;
  immutabilitySavingsGB?: number;
  sobrBlocksUpgrade?: boolean;
}) {
  return render(
    <SizingHeroCard
      sizing={SIZING}
      upgradeTotalStorageTB={overrides?.upgradeTotalStorageTB ?? null}
      storageSavingsTB={overrides?.storageSavingsTB ?? 0}
      upgradePerfTaxGB={overrides?.upgradePerfTaxGB ?? null}
      immutabilitySavingsGB={overrides?.immutabilitySavingsGB ?? 0}
      sobrBlocksUpgrade={overrides?.sobrBlocksUpgrade ?? false}
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
    renderDefault({ upgradeTotalStorageTB: 32.5, storageSavingsTB: 5.56 });
    expect(
      screen.getByText(/upgrade to VBR 13 could reduce this to/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/32\.50 TB/)).toBeInTheDocument();
  });

  it("shows the SOBR-blocks-upgrade note instead of the savings caption", () => {
    renderDefault({
      upgradeTotalStorageTB: 32.5,
      storageSavingsTB: 5.56,
      sobrBlocksUpgrade: true,
    });
    expect(
      screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
    ).toBeInTheDocument();
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
});
