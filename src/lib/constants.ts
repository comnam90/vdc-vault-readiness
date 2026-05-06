import type { PipelineStep } from "@/types/domain";

export const CARD_LABEL =
  "text-muted-foreground text-xs font-semibold tracking-wide uppercase";

export const MINIMUM_VBR_VERSION = "12.1.2";
export const EXCLUDED_JOB_TYPES = new Set(["Replica"]);
export const MINIMUM_RETENTION_DAYS = 30;
export const MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS = 30;

/**
 * UI-facing pipeline steps displayed in the ChecklistLoader component.
 *
 * NOTE: These are presentation-layer steps for user feedback, NOT a 1:1 mapping
 * to validation rule IDs. For example, "encryption" represents both the
 * "global-encryption" and "job-encryption" validation rules from a user's perspective.
 *
 * For actual validation rule IDs, see src/lib/validator.ts.
 */
export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "parse", label: "Parse healthcheck data" },
  { id: "vbr-version", label: "Validate VBR version" },
  { id: "encryption", label: "Check encryption rules" },
  { id: "aws-workload", label: "Scan for AWS workloads" },
  { id: "agent-workload", label: "Verify agent configuration" },
  { id: "license-edition", label: "Check license type" },
  { id: "sobr-analysis", label: "Analyze SOBR configuration" },
];
