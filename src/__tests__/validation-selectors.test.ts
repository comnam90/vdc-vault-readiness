import { describe, it, expect } from "vitest";
import type { ValidationResult } from "@/types/validation";
import {
  getBlockerValidations,
  getPassingValidations,
  getBlockerCount,
  hasBlockers,
} from "@/lib/validation-selectors";
import { FAIL_RESULT, PASS_RESULT, WARNING_RESULT } from "./fixtures";

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: [],
};

describe("validation selectors", () => {
  it("returns blocker validations sorted fail before warning", () => {
    const blockers = getBlockerValidations([
      WARNING_RESULT,
      PASS_RESULT,
      FAIL_RESULT,
    ]);

    expect(blockers.map((blocker) => blocker.ruleId)).toEqual([
      "job-encryption",
      "agent-workload",
    ]);
  });

  it("returns only passing validations", () => {
    const passing = getPassingValidations([
      PASS_RESULT,
      FAIL_RESULT,
      WARNING_RESULT,
      INFO_RESULT,
    ]);

    expect(passing.map((result) => result.ruleId)).toEqual(["vbr-version"]);
  });

  it("reports blocker presence and count", () => {
    const validations = [PASS_RESULT, WARNING_RESULT];

    expect(hasBlockers(validations)).toBe(true);
    expect(getBlockerCount(validations)).toBe(1);
  });
});
