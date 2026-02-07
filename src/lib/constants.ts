export const MINIMUM_VBR_VERSION = "12.1.2";

export interface PipelineStep {
  id: string;
  label: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "parse", label: "Parse healthcheck data" },
  { id: "vbr-version", label: "Validate VBR version" },
  { id: "encryption", label: "Check encryption rules" },
  { id: "aws-workload", label: "Scan for AWS workloads" },
  { id: "agent-workload", label: "Verify agent configuration" },
  { id: "license-edition", label: "Check license type" },
];
