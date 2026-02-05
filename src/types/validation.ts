export type ValidationStatus = "pass" | "fail" | "warning";

export interface ValidationResult {
  ruleId: string;
  title: string;
  status: ValidationStatus;
  message: string;
  affectedItems: string[];
}
