import { describe, it, expect } from "vitest";
import {
  MINIMUM_VBR_VERSION,
  MINIMUM_RETENTION_DAYS,
  MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS,
  EXCLUDED_JOB_TYPES,
  PIPELINE_STEPS,
} from "@/lib/constants";

describe("constants", () => {
  it("MINIMUM_VBR_VERSION is 12.1.2", () => {
    expect(MINIMUM_VBR_VERSION).toBe("12.1.2");
  });

  it("MINIMUM_RETENTION_DAYS is 30", () => {
    expect(MINIMUM_RETENTION_DAYS).toBe(30);
  });

  it("MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS is 30", () => {
    expect(MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS).toBe(30);
  });

  it("EXCLUDED_JOB_TYPES contains Replica", () => {
    expect(EXCLUDED_JOB_TYPES.has("Replica")).toBe(true);
  });

  it("EXCLUDED_JOB_TYPES is a Set", () => {
    expect(EXCLUDED_JOB_TYPES).toBeInstanceOf(Set);
  });

  it("PIPELINE_STEPS has 7 steps", () => {
    expect(PIPELINE_STEPS).toHaveLength(7);
  });

  it("PIPELINE_STEPS step ids are unique", () => {
    const ids = PIPELINE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
