import { describe, it, expect } from "vitest";
import {
  formatSize,
  formatPercent,
  formatDuration,
  formatCompressionRatio,
  formatTB,
  formatTooltipTB,
  formatGFS,
} from "@/lib/format-utils";

describe("formatSize", () => {
  it("returns null for null input", () => {
    expect(formatSize(null)).toBeNull();
  });

  it("formats 0 as GB", () => {
    expect(formatSize(0)).toEqual({ value: "0", unit: "GB" });
  });

  it("formats values below 1024 as GB", () => {
    expect(formatSize(500)).toEqual({ value: "500", unit: "GB" });
  });

  it("rounds fractional GB values for readable display", () => {
    expect(formatSize(809.518127441406)).toEqual({
      value: "809.52",
      unit: "GB",
    });
  });

  it("formats exactly 1024 as TB", () => {
    expect(formatSize(1024)).toEqual({ value: "1.00", unit: "TB" });
  });

  it("formats values above 1024 as TB with 2 decimals", () => {
    expect(formatSize(1536)).toEqual({ value: "1.50", unit: "TB" });
  });

  it("formats large TB values", () => {
    expect(formatSize(5120)).toEqual({ value: "5.00", unit: "TB" });
  });
});

describe("formatPercent", () => {
  it('returns "N/A" for null input', () => {
    expect(formatPercent(null)).toBe("N/A");
  });

  it("formats zero with one decimal place", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats values with one decimal place by default", () => {
    expect(formatPercent(5.23)).toBe("5.2%");
  });

  it("supports custom decimal places", () => {
    expect(formatPercent(13.333, 2)).toBe("13.33%");
  });
});

describe("formatDuration", () => {
  it('returns "N/A" for null input', () => {
    expect(formatDuration(null)).toBe("N/A");
  });

  it("formats minutes and seconds when hours is zero", () => {
    expect(formatDuration("00.00:06:30")).toBe("6m 30s");
  });

  it("formats hours and minutes when hours is non-zero", () => {
    expect(formatDuration("00.09:23:18")).toBe("9h 23m");
  });

  it("formats days and hours when days is non-zero", () => {
    expect(formatDuration("01.02:15:00")).toBe("1d 2h");
  });

  it('returns "N/A" for unrecognized format', () => {
    expect(formatDuration("garbage")).toBe("N/A");
  });

  it("formats zero duration", () => {
    expect(formatDuration("00.00:00:00")).toBe("0m 0s");
  });
});

describe("formatTB", () => {
  it('returns "N/A" for null input', () => {
    expect(formatTB(null)).toBe("N/A");
  });

  it("formats zero with 2 decimal places", () => {
    expect(formatTB(0)).toBe("0.00 TB");
  });

  it("formats positive values with 2 decimal places", () => {
    expect(formatTB(1.5)).toBe("1.50 TB");
  });

  it("formats large values", () => {
    expect(formatTB(123.456)).toBe("123.46 TB");
  });
});

describe("formatTooltipTB", () => {
  it("returns formatted TB string and 'Source' label for a number", () => {
    expect(formatTooltipTB(1.5)).toEqual(["1.50 TB", "Source"]);
  });
  it("returns empty array for undefined", () => {
    expect(formatTooltipTB(undefined)).toEqual([]);
  });
});

describe("formatGFS", () => {
  it('returns "None configured" when all inputs are null', () => {
    expect(formatGFS(null, null, null)).toBe("None configured");
  });

  it("formats weekly only", () => {
    expect(formatGFS(4, null, null)).toBe("Weekly: 4");
  });

  it("formats monthly only", () => {
    expect(formatGFS(null, 12, null)).toBe("Monthly: 12");
  });

  it("formats yearly only", () => {
    expect(formatGFS(null, null, 7)).toBe("Yearly: 7");
  });

  it("formats all three in order", () => {
    expect(formatGFS(4, 12, 7)).toBe("Weekly: 4, Monthly: 12, Yearly: 7");
  });

  it("formats weekly and monthly without yearly", () => {
    expect(formatGFS(4, 12, null)).toBe("Weekly: 4, Monthly: 12");
  });
});

describe("formatCompressionRatio", () => {
  it('returns "N/A" when both inputs are null', () => {
    expect(formatCompressionRatio(null, null)).toBe("N/A");
  });

  it('returns "N/A" when source is null', () => {
    expect(formatCompressionRatio(null, 512)).toBe("N/A");
  });

  it('returns "N/A" when disk is null', () => {
    expect(formatCompressionRatio(1024, null)).toBe("N/A");
  });

  it('returns "N/A" when source is 0', () => {
    expect(formatCompressionRatio(0, 512)).toBe("N/A");
  });

  it('returns "N/A" when disk is 0', () => {
    expect(formatCompressionRatio(1024, 0)).toBe("N/A");
  });

  it("computes correct ratio", () => {
    expect(formatCompressionRatio(1024, 512)).toBe("2.0x");
  });

  it("handles 1:1 ratio", () => {
    expect(formatCompressionRatio(500, 500)).toBe("1.0x");
  });

  it("handles fractional ratios", () => {
    expect(formatCompressionRatio(1000, 750)).toBe("1.3x");
  });
});
