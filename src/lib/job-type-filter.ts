import { EXCLUDED_JOB_TYPES } from "@/lib/constants";

const EXCLUDED_EXACT = new Set(
  [...EXCLUDED_JOB_TYPES].map((type) => type.toLowerCase()),
);

// Current veeam-healthcheck exports use friendly labels from VBR's
// TypeToString (e.g. "VMware Replication", "Hyper-V Replication");
// older exports use the raw "Replica". Replicas aren't backups, so they
// are excluded from sizing and validation either way.
const REPLICATION_LABEL = /(^|\s)replication$/;

export function isExcludedJobType(jobType: string): boolean {
  const normalized = jobType.trim().toLowerCase();
  return EXCLUDED_EXACT.has(normalized) || REPLICATION_LABEL.test(normalized);
}
