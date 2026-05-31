import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SizingProportionBar } from "@/components/dashboard/sizing-proportion-bar";

// Make TooltipContent always visible so tooltip strings can be asserted without hover interaction.
vi.mock("@/components/ui/tooltip", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/ui/tooltip")>();
  return {
    ...actual,
    TooltipContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="tooltip-content">{children}</div>
    ),
  };
});

const COUNTS = { daily: 30, weekly: 4, monthly: 11, yearly: 3 };

const FULL_BUCKETS = {
  daily: 7.875,
  weekly: 1.05,
  monthly: 14.4375,
  yearly: 14.7,
  immutability: 2.625,
  buffer: 0,
};
const FULL_TOTAL = 7.875 + 1.05 + 14.4375 + 14.7 + 2.625; // 40.6875

const BUFFER_TB = 4.0;
const BUFFERED_BUCKETS = {
  ...FULL_BUCKETS,
  buffer: BUFFER_TB,
};
const BUFFERED_TOTAL = FULL_TOTAL + BUFFER_TB;

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
          buffer: 0,
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

  it("renders a buffer segment when buffer > 0", () => {
    const { container } = render(
      <SizingProportionBar
        buckets={BUFFERED_BUCKETS}
        sumTB={BUFFERED_TOTAL}
        counts={COUNTS}
      />,
    );
    const bufferSegment = container.querySelector("[data-segment='buffer']");
    expect(bufferSegment).not.toBeNull();
  });

  it("renders six segments (Y → M → W → D → Immutability → Buffer) when buffer > 0", () => {
    const { container } = render(
      <SizingProportionBar
        buckets={BUFFERED_BUCKETS}
        sumTB={BUFFERED_TOTAL}
        counts={COUNTS}
      />,
    );
    const segments = container.querySelectorAll("[data-segment]");
    expect(segments.length).toBe(6);
    expect(segments[5].getAttribute("data-segment")).toBe("buffer");
  });

  it("does not render a buffer segment when buffer is 0", () => {
    const { container } = render(
      <SizingProportionBar
        buckets={FULL_BUCKETS}
        sumTB={FULL_TOTAL}
        counts={COUNTS}
      />,
    );
    const bufferSegment = container.querySelector("[data-segment='buffer']");
    expect(bufferSegment).toBeNull();
  });

  it("includes Buffer in the aria-label when buffer > 0", () => {
    render(
      <SizingProportionBar
        buckets={BUFFERED_BUCKETS}
        sumTB={BUFFERED_TOTAL}
        counts={COUNTS}
      />,
    );
    const group = screen.getByRole("group", { name: /retention composition/i });
    const label = group.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Buffer/);
    expect(label).toMatch(/4\.00 TB/);
  });

  it("renders buffer tooltip text 'Buffer (spare capacity): X TB (Y%)'", () => {
    const { container } = render(
      <SizingProportionBar
        buckets={BUFFERED_BUCKETS}
        sumTB={BUFFERED_TOTAL}
        counts={COUNTS}
      />,
    );
    const bufferSegment = container.querySelector("[data-segment='buffer']")!;
    const tooltip = bufferSegment.nextSibling as HTMLElement;
    const pct = Math.round((BUFFER_TB / BUFFERED_TOTAL) * 100);
    expect(tooltip.textContent).toBe(
      `Buffer (spare capacity): 4.00 TB (${pct}%)`,
    );
  });
});
