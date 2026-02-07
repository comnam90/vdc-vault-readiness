import { describe, it, expect } from "vitest";
import { isVersionAtLeast } from "@/lib/version-compare";

describe("isVersionAtLeast", () => {
  it("returns true when version meets minimum", () => {
    expect(isVersionAtLeast("12.1.2.100", "12.1.2")).toBe(true);
    expect(isVersionAtLeast("13.0.1.1071", "12.1.2")).toBe(true);
    expect(isVersionAtLeast("12.2.0.100", "12.1.2")).toBe(true);
  });

  it("returns false when version is below minimum", () => {
    expect(isVersionAtLeast("12.1.1.500", "12.1.2")).toBe(false);
    expect(isVersionAtLeast("11.0.0.100", "12.1.2")).toBe(false);
    expect(isVersionAtLeast("12.0.5.200", "12.1.2")).toBe(false);
  });

  it("handles exact match", () => {
    expect(isVersionAtLeast("12.1.2", "12.1.2")).toBe(true);
  });

  it("handles version with only major.minor", () => {
    expect(isVersionAtLeast("13.0", "12.1.2")).toBe(true);
    expect(isVersionAtLeast("11.5", "12.1.2")).toBe(false);
  });

  it("handles single number version", () => {
    expect(isVersionAtLeast("12", "12.1.2")).toBe(false);
    expect(isVersionAtLeast("13", "12.1.2")).toBe(true);
  });

  it("handles non-numeric characters in version parts", () => {
    expect(isVersionAtLeast("12.a.2", "12.1.2")).toBe(false);
    expect(isVersionAtLeast("12.1.b", "12.1.2")).toBe(false);
    expect(isVersionAtLeast("abc.def.ghi", "12.1.2")).toBe(false);
  });

  it("handles empty string", () => {
    expect(isVersionAtLeast("", "12.1.2")).toBe(false);
  });

  it("handles version with extra parts (4+ segments)", () => {
    expect(isVersionAtLeast("12.1.2.100.200", "12.1.2")).toBe(true);
    expect(isVersionAtLeast("12.1.1.500", "12.1.2")).toBe(false);
  });

  it("handles whitespace in version string", () => {
    expect(isVersionAtLeast("12.1. 2", "12.1.2")).toBe(true);
    expect(isVersionAtLeast(" 12.1.2", "12.1.2")).toBe(true);
  });
});
