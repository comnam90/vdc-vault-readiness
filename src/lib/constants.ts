export const MINIMUM_VBR_VERSION = "12.1.2";

export interface PipelineStep {
  id: string;
  label: string;
}

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
];
