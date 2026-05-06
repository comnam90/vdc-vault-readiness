import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SizingProportionBar } from "@/components/dashboard/sizing-proportion-bar";

const COUNTS = { daily: 30, weekly: 4, monthly: 11, yearly: 3 };

const FULL_BUCKETS = {
  daily: 7.875,
  weekly: 1.05,
  monthly: 14.4375,
  yearly: 14.7,
  immutability: 2.625,
};
const FULL_TOTAL = 7.875 + 1.05 + 14.4375 + 14.7 + 2.625; // 40.6875

describe("SizingProportionBar", () => {
  it('renders an "unavailable" caption when sumTB is 0', () => {
    render(
      <SizingProportionBar
        buckets={{
          daily: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0,
          immutability: 0,
        }}
        sumTB={0}
        counts={{ daily: 0, weekly: 0, monthly: 0, yearly: 0 }}
      />,
    );
    expect(
      screen.getByText(/restore-point breakdown unavailable/i),
    ).toBeInTheDocument();
  });

  it("renders five data segments in Y → M → W → D → Immutability order", () => {
    const { container } = render(
      <SizingProportionBar
        buckets={FULL_BUCKETS}
        sumTB={FULL_TOTAL}
        counts={COUNTS}
      />,
    );
    const segments = container.querySelectorAll("[data-segment]");
    expect(segments.length).toBe(5);
    expect(segments[0].getAttribute("data-segment")).toBe("yearly");
    expect(segments[1].getAttribute("data-segment")).toBe("monthly");
    expect(segments[2].getAttribute("data-segment")).toBe("weekly");
    expect(segments[3].getAttribute("data-segment")).toBe("daily");
    expect(segments[4].getAttribute("data-segment")).toBe("immutability");
  });

  it("exposes a group aria-label naming each bucket including immutability, TB and percent", () => {
    render(
      <SizingProportionBar
        buckets={FULL_BUCKETS}
        sumTB={FULL_TOTAL}
        counts={COUNTS}
      />,
    );
    const group = screen.getByRole("group", {
      name: /retention composition/i,
    });
    const label = group.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Yearly/);
    expect(label).toMatch(/Monthly/);
    expect(label).toMatch(/Weekly/);
    expect(label).toMatch(/Daily/);
    expect(label).toMatch(/Immutability/);
    expect(label).toMatch(/14\.70 TB/);
    expect(label).toMatch(/2\.63 TB|2\.62 TB/);
  });
});
