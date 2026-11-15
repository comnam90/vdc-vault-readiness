import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/relative-time";

const NOW = new Date("2026-05-06T14:30:00Z");

function isoMinusMs(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("returns 'just now' for timestamps less than a minute old", () => {
    expect(formatRelativeTime(isoMinusMs(30 * SECOND), NOW)).toBe("just now");
  });

  it("returns 'just now' for the current instant", () => {
    expect(formatRelativeTime(NOW.toISOString(), NOW)).toBe("just now");
  });

  it("returns singular minutes for one minute ago", () => {
    expect(formatRelativeTime(isoMinusMs(1 * MINUTE), NOW)).toBe("1 min ago");
  });

  it("returns plural minutes for many minutes ago", () => {
    expect(formatRelativeTime(isoMinusMs(45 * MINUTE), NOW)).toBe("45 min ago");
  });

  it("returns singular hours for one hour ago on the same calendar day", () => {
    expect(formatRelativeTime(isoMinusMs(1 * HOUR), NOW)).toBe("1 hour ago");
  });

  it("returns plural hours for several hours on the same calendar day", () => {
    expect(formatRelativeTime(isoMinusMs(5 * HOUR), NOW)).toBe("5 hours ago");
  });

  it("returns 'yesterday' when calendar day has rolled over but it's <24h", () => {
    // 13 hours before midnight rollover: NOW is 14:30 UTC, so 13h prior is 01:30 UTC same day.
    // To force a calendar-day rollover: pick a NOW just past midnight and a timestamp just before.
    const justAfterMidnight = new Date("2026-05-06T00:30:00Z");
    const justBeforeMidnight = new Date("2026-05-05T23:50:00Z").toISOString();
    expect(formatRelativeTime(justBeforeMidnight, justAfterMidnight)).toBe(
      "yesterday",
    );
  });

  it("returns 'yesterday' for ~24h ago when on the previous calendar day", () => {
    expect(formatRelativeTime(isoMinusMs(25 * HOUR), NOW)).toBe("yesterday");
  });

  it("returns days for 2-6 days old", () => {
    expect(formatRelativeTime(isoMinusMs(3 * DAY), NOW)).toBe("3 days ago");
    expect(formatRelativeTime(isoMinusMs(6 * DAY), NOW)).toBe("6 days ago");
  });

  it("returns weeks for 7+ days, up to ~5 weeks", () => {
    expect(formatRelativeTime(isoMinusMs(8 * DAY), NOW)).toBe("1 week ago");
    expect(formatRelativeTime(isoMinusMs(20 * DAY), NOW)).toBe("2 weeks ago");
  });

  it("returns 'just now' when the timestamp is in the future (clock skew)", () => {
    const future = new Date(NOW.getTime() + 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future, NOW)).toBe("just now");
  });

  it("falls back to a short date format for distant timestamps", () => {
    const distant = new Date("2025-08-15T10:00:00Z").toISOString();
    const result = formatRelativeTime(distant, NOW);
    // Don't assert exact locale formatting; just confirm it includes the year
    // and is not one of the bucket strings.
    expect(result).toMatch(/2025/);
    expect(result).not.toMatch(/(ago|yesterday|just now)/);
  });
});
