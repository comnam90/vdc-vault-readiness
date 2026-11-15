import { describe, expect, it } from "vitest";
import { selectIdsToEvict } from "@/lib/recent-scans-fifo";

describe("selectIdsToEvict", () => {
  it("returns an empty array when there are no existing ids", () => {
    expect(selectIdsToEvict([], 5)).toEqual([]);
  });

  it("returns an empty array when below the cap", () => {
    expect(selectIdsToEvict([1, 2, 3], 5)).toEqual([]);
  });

  it("returns an empty array when exactly at the cap", () => {
    expect(selectIdsToEvict([1, 2, 3, 4, 5], 5)).toEqual([]);
  });

  it("returns the single oldest id when one over the cap", () => {
    expect(selectIdsToEvict([10, 20, 30, 40, 50, 60], 5)).toEqual([10]);
  });

  it("returns multiple oldest ids when many over the cap", () => {
    expect(selectIdsToEvict([10, 20, 30, 40, 50, 60, 70, 80], 5)).toEqual([
      10, 20, 30,
    ]);
  });

  it("sorts unsorted input before selecting eviction candidates", () => {
    expect(selectIdsToEvict([60, 10, 50, 40, 30, 20], 5)).toEqual([10]);
  });

  it("returns all ids when maxKeep is zero", () => {
    expect(selectIdsToEvict([3, 1, 2], 0)).toEqual([1, 2, 3]);
  });
});
