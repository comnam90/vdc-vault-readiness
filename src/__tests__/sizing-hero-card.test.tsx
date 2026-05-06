import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SizingHeroCard } from "@/components/dashboard/sizing-hero-card";
import type { DerivedSizing } from "@/lib/sizing-derivation";

const SIZING: DerivedSizing = {
  totalStorageTB: 38.06,
  initialFullTB: 5.25,
  dailyIncrementalTB: 0.2625,
  gfsBuckets: { daily: 7.875, weekly: 1.05, monthly: 14.4375, yearly: 14.7 },
  gfsSumTB: 38.0625,
  gfsProportions: {
    daily: 7.875 / 38.0625,
    weekly: 1.05 / 38.0625,
    monthly: 14.4375 / 38.0625,
    yearly: 14.7 / 38.0625,
  },
  gfsRestorePointCount: 48,
  gfsBucketCounts: { daily: 30, weekly: 4, monthly: 11, yearly: 3 },
  performanceTaxGB: 2688,
  performanceTaxTB: 2.625,
};

describe("SizingHeroCard", () => {
  it("renders the hero metric prominently", () => {
    render(
      <SizingHeroCard
        sizing={SIZING}
        upgradeTotalStorageTB={null}
        storageSavingsTB={0}
        sobrBlocksUpgrade={false}
      />,
    );
    expect(screen.getByText("38.06 TB")).toBeInTheDocument();
  });

  it("hides the upgrade caption when savings <= 0", () => {
    render(
      <SizingHeroCard
        sizing={SIZING}
        upgradeTotalStorageTB={null}
        storageSavingsTB={0}
        sobrBlocksUpgrade={false}
      />,
    );
    expect(
      screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
    ).not.toBeInTheDocument();
  });

  it("shows the upgrade caption when savings > 0", () => {
    render(
      <SizingHeroCard
        sizing={SIZING}
        upgradeTotalStorageTB={32.5}
        storageSavingsTB={5.56}
        sobrBlocksUpgrade={false}
      />,
    );
    expect(
      screen.getByText(/upgrade to VBR 13 could reduce this to/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/32\.50 TB/)).toBeInTheDocument();
  });

  it("shows the SOBR-blocks-upgrade note instead of the savings caption", () => {
    render(
      <SizingHeroCard
        sizing={SIZING}
        upgradeTotalStorageTB={32.5}
        storageSavingsTB={5.56}
        sobrBlocksUpgrade
      />,
    );
    expect(
      screen.queryByText(/upgrade to VBR 13 could reduce this to/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/SOBR Capacity Tier still uses VBR 12 sizing/i),
    ).toBeInTheDocument();
  });

  it("decorates the card frame with a top accent border", () => {
    const { container } = render(
      <SizingHeroCard
        sizing={SIZING}
        upgradeTotalStorageTB={null}
        storageSavingsTB={0}
        sobrBlocksUpgrade={false}
      />,
    );
    const frame = container.querySelector(".border-t-4.border-t-primary");
    expect(frame).not.toBeNull();
  });
});
