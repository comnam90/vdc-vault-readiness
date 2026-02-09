import type { ValidationResult } from "@/types/validation";

const isBlocker = (result: ValidationResult) =>
  result.status === "fail" || result.status === "warning";

export const getBlockerValidations = (validations: ValidationResult[]) =>
  validations.filter(isBlocker).sort((a, b) => {
    if (a.status === "fail" && b.status !== "fail") return -1;
    if (a.status !== "fail" && b.status === "fail") return 1;
    return 0;
  });

export const getPassingValidations = (validations: ValidationResult[]) =>
  validations.filter((result) => result.status === "pass");

export const hasBlockers = (validations: ValidationResult[]) =>
  getBlockerValidations(validations).length > 0;

export const getBlockerCount = (validations: ValidationResult[]) =>
  getBlockerValidations(validations).length;
