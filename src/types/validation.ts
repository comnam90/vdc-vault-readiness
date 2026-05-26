export type ValidationStatus = "pass" | "fail" | "warning" | "info" | "skipped";

export interface ValidationResult {
  ruleId: string;
  title: string;
  status: ValidationStatus;
  message: string;
  affectedItems: string[];
}
