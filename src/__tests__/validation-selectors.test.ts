import { describe, it, expect } from "vitest";
import type { ValidationResult } from "@/types/validation";
import {
  getBlockerValidations,
  getPassingValidations,
  getNoteValidations,
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

const SKIPPED_RESULT: ValidationResult = {
  ruleId: "config-backup-encryption",
  title: "Configuration Backup Encryption",
  status: "skipped",
  message: "Check skipped — security summary missing.",
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
      "agent-policy-gateway-required",
    ]);
  });

  it("returns only passing validations", () => {
    const passing = getPassingValidations([
      PASS_RESULT,
      FAIL_RESULT,
      WARNING_RESULT,
      INFO_RESULT,
      SKIPPED_RESULT,
    ]);

    expect(passing.map((result) => result.ruleId)).toEqual(["vbr-version"]);
  });

  it("returns info and skipped validations in original order", () => {
    const notes = getNoteValidations([
      PASS_RESULT,
      INFO_RESULT,
      FAIL_RESULT,
      SKIPPED_RESULT,
      WARNING_RESULT,
    ]);

    expect(notes.map((result) => result.ruleId)).toEqual([
      "license-edition",
      "config-backup-encryption",
    ]);
  });

  it("returns empty array when no info or skipped validations present", () => {
    const notes = getNoteValidations([
      PASS_RESULT,
      FAIL_RESULT,
      WARNING_RESULT,
    ]);
    expect(notes).toEqual([]);
  });

  it("reports blocker presence and count", () => {
    const validations = [PASS_RESULT, WARNING_RESULT];

    expect(hasBlockers(validations)).toBe(true);
    expect(getBlockerCount(validations)).toBe(1);
  });
});
